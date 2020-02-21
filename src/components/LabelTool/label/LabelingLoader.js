import React, {Component} from 'react';
import LabelingApp from './LabelingApp';
import {router} from 'umi';
import {Loader} from 'semantic-ui-react';
import DocumentMeta from 'react-document-meta';


import {demoMocks} from './demo';

export default class LabelingLoader extends Component {
  constructor(props) {
    super(props);
    this.state = {
      project: null,
      image: null,
      isLoaded: false,
      error: null,
      labelData: {},
      commandType: 'bbox'   // bbox-矩形  polygon-多边形
    };
    this.labelingAppRef = React.createRef();
  }

  async fetch(...args) {
    // 输出标注信息：包含图片尺寸  标注的经纬度（待转化成横纵坐标值）
    console.log('--fetch in LabelLingLoader--', JSON.parse(args[1]['body']))
    const {projectId} = this.props.match.params;
    if (projectId === 'demo') {
      const path = typeof args[0] === 'string' ? args[0] : args[0].pathname;
      return demoMocks[path](...args);
    }
    // 注释掉编辑提交操作
    // return await fetch(...args);
  }

  componentDidMount() {
    this.getLabelingInfo();
    // console.log('--componentDidMount--')
  }

  /*componentDidUpdate(prevProps) {
    // console.log('--componentDidUpdate--', prevProps)
    const {labelingInfo} = this.props
    if (prevProps.labelingInfo.image.id !== labelingInfo.image.id) {
      this.getLabelingInfo();
    }
  }*/

  componentWillReceiveProps(nextProps, nextContext) {
    this.getLabelingInfo();
  }


  renderCommand = (commandType) => {
    if (this.labelingAppRef && this.labelingAppRef.current) {
      this.labelingAppRef.current.compRef.current.compRef.current.compRef.current.handleSelected(commandType)
      this.setState({commandType})
    }
  }

  // 将经纬度转为涂层坐标：暂时支持 bbox(矩形框)
  calcLatLngToLayerPoint = (callback) => {

    const {labelData = {labels: {bbox: [], polygon: []}}} = this.state;
    const bbox = labelData && labelData.labels ? labelData.labels.bbox : [];
    const polygon = labelData && labelData.labels ? labelData.labels.polygon : [];
    if (this.labelingAppRef && this.labelingAppRef.current) {
      const canvasComp = this.labelingAppRef.current.compRef.current.compRef.current.compRef.current.canvasRef.current;
      const map = canvasComp.mapRef.current.leafletElement;
      const pixelOrigin = map.getPixelOrigin();

      let pBoxList = []     // 矩形框集合
      let pPolygonList = []     // 矩形框集合
      // 处理矩形框bbox
      if (bbox && bbox.length) {
        for (let i = 0; i < bbox.length; i++) {
          const pbox = bbox[i]
          const points = []    // 单个矩形框坐标：坐上+右下
          for (let j = 0; j < pbox.points.length; j++) {
            const layerLatlng = pbox.points[j]
            // 换算：需要加图层上的初始坐标
            const layerPoint = map.latLngToLayerPoint(layerLatlng)
            const newPoint = [layerPoint.x + pixelOrigin.x, layerPoint.y + pixelOrigin.y]
            points.push(newPoint)
          }
          pBoxList.push(points)
        }
      }
      // 处理多边形框polygon
      if (polygon && polygon.length) {
        for (let i = 0; i < polygon.length; i++) {
          const ppolygon = polygon[i]
          const points = []    // 单个多边形框坐标
          for (let j = 0; j < ppolygon.points.length; j++) {
            // 换算：需要加图层上的初始坐标
            const layerLatlng = ppolygon.points[j]
            const layerPoint = map.latLngToLayerPoint(layerLatlng)
            const newPoint = [layerPoint.x + pixelOrigin.x, layerPoint.y + pixelOrigin.y]
            points.push(newPoint)
          }
          pPolygonList.push(points)
        }
      }

      callback && callback({pBoxList, pPolygonList, pixelOrigin})
    }
  }

  getLabelingInfo() {
    const {labelingInfo} = this.props;
    const response = labelingInfo
    const {project, image} = response;
    const {labelData} = image
    this.setState({
      isLoaded: true,
      project,
      image,
      ...labelData && {labelData}
    });
  }

  async pushUpdate(labelData) {
    // 修改坐标点之后的操作:暂存当前坐标信息，并且保持该状态
    console.log('--修改坐标点之后的操作--', labelData);
    this.setState({labelData});
   /* // 连续绘图时调用，暂不支持
    const {commandType} = this.state
    this.renderCommand(commandType)*/
  }

  async markComplete() {
    const {imageId} = this.props.match.params;
    await this.fetch('/api/images/' + imageId, {
      method: 'PATCH',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({labeled: true}),
    });
  }

  render() {
    const {history} = this.props;

    const {project, image, isLoaded, error} = this.state;

    if (error) {
      return <div>Error: {error.message}</div>;
    } else if (!isLoaded) {
      return <Loader active inline="centered"/>;
    }

    const title = `Image ${image.id} for project ${project.name} -- Label Tool`;


    const props = {
      onBack: () => {
        history.goBack();
      },
      onSkip: () => {
        history.push(`/label/${project.id}/`);
      },
      onSubmit: () => {
        this.markComplete();
        history.push(`/label/${project.id}/`);
      },
      onLabelChange: this.pushUpdate.bind(this),
    };

    const {referenceLink, referenceText} = project;

    return (
      <DocumentMeta title={title}>
        <LabelingApp
          ref={this.labelingAppRef}
          labels={project.form.formParts}
          reference={{referenceLink, referenceText}}
          labelData={image.labelData.labels || {}}
          imageUrl={image.link}
          fetch={this.fetch.bind(this)}
          demo={project.id === 'demo'}
          {...props}
        />
      </DocumentMeta>
    );
  }
}
