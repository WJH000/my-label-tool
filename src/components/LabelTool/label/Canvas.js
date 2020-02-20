import React, {Component} from 'react';
import {CRS} from 'leaflet';
import {Map, ImageOverlay, ZoomControl} from 'react-leaflet';
import Control from 'react-leaflet-control';
import Hotkeys from 'react-hot-keys';
import update from 'immutability-helper';
import 'leaflet-path-drag';

import 'leaflet/dist/leaflet.css';

import {Icon} from 'semantic-ui-react';

import {BBoxFigure, PolygonFigure} from './Figure';

import {convertPoint, lighten, colorMapping} from './utils';
import {withBounds, maxZoom} from './CalcBoundsHOC';

class Canvas extends Component {
  constructor(props, context) {
    super(props, context);

    this.state = {
      zoom: 0,
      selectedFigureId: null,
      cursorPos: {lat: 0, lng: 0},
    };
    this.prevSelectedFigure = null;
    this.skipNextClickEvent = false;

    this.mapRef = React.createRef();
    this.handleChange = this.handleChange.bind(this);
    this.handleClick = this.handleClick.bind(this);
  }

  componentDidUpdate(prevProps) {
    const {onSelectionChange} = this.props;
    const {selectedFigureId} = this.state;

    if (this.prevSelectedFigureId !== selectedFigureId && onSelectionChange) {
      this.prevSelectedFigureId = selectedFigureId;
      onSelectionChange(selectedFigureId);
    }
  }

  componentDidMount() {
    console.log('--重新调整窗口大小--')
    window.resizeTo(800,600)
  }


  getSelectedFigure() {
    const {selectedFigureId} = this.state;
    const {figures} = this.props;
    return figures.find(f => f.id === selectedFigureId);
  }

  handleChange(eventType, {point, pos, figure, points}) {

    const {onChange, unfinishedFigure} = this.props;
    const drawing = !!unfinishedFigure;

    switch (eventType) {
      case 'add':
        if (drawing) {
          let newState = unfinishedFigure.points;
          newState = update(newState, {$push: [point]});

          onChange(
            'unfinished',
            update(unfinishedFigure, {
              points: {
                $set: newState,
              },
            })
          );
        } else {
          onChange(
            'replace',
            update(figure, {points: {$splice: [[pos, 0, point]]}})
          );
        }
        break;

      case 'end':
        const f = unfinishedFigure;
        onChange('new', f);
        break;

      case 'move':
        onChange(
          'replace',
          update(figure, {points: {$splice: [[pos, 1, point]]}})
        );
        break;

      case 'replace':
        onChange('replace', update(figure, {points: {$set: points}}));
        break;

      case 'remove':
        onChange(
          'replace',
          update(figure, {points: {$splice: [[pos, 1]]}})
        );
        break;

      default:
        throw new Error('unknown event type ' + eventType);
    }
  }

  handleClick(e) {
    const {unfinishedFigure} = this.props;
    const drawing = !!unfinishedFigure;

    if (this.skipNextClickEvent) {
      // a hack, for whatever reason it is really hard to stop event propagation in leaflet
      this.skipNextClickEvent = false;
      return;
    }

    if (drawing) {
      this.handleChange('add', {point: convertPoint(e.latlng)});
      return;
    }

    if (!drawing) {
      this.setState({selectedFigureId: null});
      return;
    }
  }

  renderFigure(figure, options) {
    const Comp = figure.type === 'bbox' ? BBoxFigure : PolygonFigure;

    return (
      <Comp
        key={figure.id}
        figure={figure}
        options={options}
        skipNextClick={() => (this.skipNextClickEvent = true)}
      />
    );
  }

  render() {
    let {
      url,
      bounds,
      height,
      width,
      figures,
      unfinishedFigure,
      onChange,
      onReassignment,
      style,
    } = this.props;
    // url = 'http://58.215.9.78:50759/static/login_background.6151a605.png';
    const {zoom, selectedFigureId, cursorPos} = this.state;

    const drawing = !!unfinishedFigure;

    const calcDistance = (p1, p2) => {
      const map = this.mapRef.current.leafletElement;
      const calcDiatande = map.latLngToLayerPoint(p1).distanceTo(map.latLngToLayerPoint(p2))
      return calcDiatande;
    };

    const unfinishedDrawingDOM = drawing
      ? this.renderFigure(unfinishedFigure, {
        finished: false,
        editing: false,
        interactive: false,
        color: colorMapping[unfinishedFigure.color],
        onChange: this.handleChange,
        calcDistance,
        newPoint: cursorPos,
      })
      : null;

    const getColor = f =>
      f.tracingOptions && f.tracingOptions.enabled
        ? lighten(colorMapping[f.color], 80)
        : colorMapping[f.color];
    const figuresDOM = figures.map((f, i) =>
      this.renderFigure(f, {
        editing: selectedFigureId === f.id && !drawing,
        finished: true,
        interactive: !drawing,
        sketch: f.tracingOptions && f.tracingOptions.enabled,
        color: getColor(f),
        vertexColor: colorMapping[f.color],
        onSelect: () => this.setState({selectedFigureId: f.id}),
        onChange: this.handleChange,
        calcDistance,
      })
    );

    const hotkeysDOM = (
      <Hotkeys
        keyName="backspace,del,c,f,-,=,left,right,up,down"
        onKeyDown={key => {
          const tagName = document.activeElement
            ? document.activeElement.tagName.toLowerCase()
            : null;
          if (['input', 'textarea'].includes(tagName)) {
            return false;
          }
          if (drawing) {
            if (key === 'f') {
              const {type, points} = unfinishedFigure;
              if (type === 'polygon' && points.length >= 3) {
                this.handleChange('end', {});
              }
            }
          } else {
            if (key === 'c') {
              if (selectedFigureId && this.getSelectedFigure()) {
                onReassignment(this.getSelectedFigure().type);
              }
            } else if (key === 'backspace' || key === 'del') {
              if (selectedFigureId && this.getSelectedFigure()) {
                onChange('delete', this.getSelectedFigure());
              }
            }
          }

          const map = this.mapRef.current.leafletElement;
          if (key === 'left') {
            map.panBy([80, 0]);
          }
          if (key === 'right') {
            map.panBy([-80, 0]);
          }
          if (key === 'up') {
            map.panBy([0, 80]);
          }
          if (key === 'down') {
            map.panBy([0, -80]);
          }
          if (key === '=') {
            map.setZoom(map.getZoom() + 1);
          }
          if (key === '-') {
            map.setZoom(map.getZoom() - 1);
          }
        }}
      />
    );

    let renderedTrace = null;
    const selectedFigure = this.getSelectedFigure();
    if (selectedFigure && selectedFigure.type === 'polygon') {
      const trace = selectedFigure.tracingOptions
        ? selectedFigure.tracingOptions.trace || []
        : [];
      const figure = {
        id: 'trace',
        type: 'line',
        points: trace,
      };
      const traceOptions = {
        editing: false,
        finished: true,
        color: colorMapping[selectedFigure.color],
      };
      renderedTrace = <PolygonFigure figure={figure} options={traceOptions}/>;
    }

    return (
      <div>
        <div
          style={{
            cursor: drawing ? 'crosshair' : 'grab',
            height: '100%',
            ...style,
          }}
        >

          <Map
            crs={CRS.Simple}
            zoom={zoom}
            minZoom={-50}
            maxZoom={maxZoom}
            center={[height / 2, width / 2]}
            zoomAnimation={false}
            zoomSnap={0.1}
            zoomControl={false}
            keyboard={false}
            attributionControl={false}
            onClick={this.handleClick}
            onZoom={e => this.setState({zoom: e.target.getZoom()})}
            onMousemove={e => this.setState({cursorPos: e.latlng})}
            ref={this.mapRef}
          >
            {/*标注组件图片显示容器,需要手动添加*/}
            <div
              /*style={{position: 'fixed', bottom: 0, right: 0, zIndex: -5000, opacity: 0}}*/
            >
              <canvas id="test-canvas" height="500" width="500" style={{opacity:0}}></canvas>
            </div>
            <ZoomControl position="bottomright"/>
            <Control className="leaflet-bar" position="bottomright">
              <a
                role="button"
                title="Zoom reset"
                href="#"
                onClick={() => {
                  const map = this.mapRef.current.leafletElement;
                  map.setView(map.options.center, map.options.zoom);
                }}
              >
                <Icon name="redo" fitted style={{fontSize: '1.2em'}}/>
              </a>
            </Control>
            <ImageOverlay url={url} bounds={bounds}/>
            {unfinishedDrawingDOM}
            {renderedTrace}
            {figuresDOM}
            {hotkeysDOM}
          </Map>
        </div>
      </div>

    );
  }
}

export default withBounds(Canvas);
