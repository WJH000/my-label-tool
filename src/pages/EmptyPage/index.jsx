import {PageHeaderWrapper} from '@ant-design/pro-layout';
import React, {useState, useEffect, Component} from 'react';
import {Spin, Button, Row, Col} from 'antd';
import styles from './index.less';
// import LabelingLoader from '@/components/LabelTool/label/LabelingLoader'
import {LabelingLoader} from "isa-label-tool";
import testPic from '@/assets/603010000155.jpg'

const response = {
  "project": {
    "id": 3,
    "name": "New Project",
    "referenceText": null,
    "referenceLink": null,
    "form": {
      "formParts": [
        {"id": "bbox", "name": "绘制矩形框", "type": "bbox"},
        {
          "id": "polygon",
          "name": "自由勾画",
          "type": "polygon"
        }, {"id": "text", "name": "输入框", "type": "text", "prompt": "1111"}, {
          "id": "select",
          "name": "多选",
          "type": "select",
          "options": ["Option1", "Option2", "Option3", "Option4"]
        }, {
          "id": "select-one",
          "name": "单选",
          "type": "select-one",
          "options": ["Option1", "Option2", "Option3", "Option4"]
        }]
    }
  },
  "image": {
    "id": 12,
    "originalName": "603010000044.jpg",
    "link": testPic,
    "externalLink": null,
    "localPath": null,
    "labeled": 0,
    "labelData": {
      "labels": {
        "bbox": [{
          "id": "wh1jux8rnog96fsinbj1mn",
          "type": "bbox",
          // "points": [{lat: -28.76485112085743, lng: -206.78014016708045}, {lat: 574, lng: 720.1546541599641}],
          "points": [{lat: 0, lng: 0}, {lat: 576, lng: 720}],
          "tracingOptions": {"trace": []}
        }], "polygon": [], "text": [], "select": [], "select-one": [], "__temp": []
      }, "height": 910, "width": 1260
    },
    "lastEdited": 1582026447226,
    "projectsId": 3
  }
}

export default class Index extends Component {
  constructor() {
    super();
    this.state = {
      pBoxList: [],
      pPolygonList: [],
      pixelOrigin: {}
    }
    this.labelingLoaderRef = React.createRef();
  }

  handleRenderLabel = (type = 'bbox') => {
    if (this.labelingLoaderRef && this.labelingLoaderRef.current) {
      this.labelingLoaderRef.current.renderCommand(type)
    }
  }

  handleSaveROI = () => {
    if (this.labelingLoaderRef && this.labelingLoaderRef.current) {
      this.labelingLoaderRef.current.calcLatLngToLayerPoint(({pBoxList, pPolygonList, pixelOrigin}) => {
        console.log('--handleSaveROI --', pBoxList, pPolygonList, pixelOrigin)
        this.setState({pBoxList, pPolygonList, pixelOrigin})
      })
    }
  }

  render() {
    const {pBoxList, pPolygonList, pixelOrigin} = this.state
    console.log('pixelOrigin', pixelOrigin)
    return (
      <div>
        <Row>
          <Col md={18}>
            <LabelingLoader labelingInfo={response} ref={this.labelingLoaderRef}/>
          </Col>
          <Col md={6}>
            <Button onClick={this.handleRenderLabel.bind(this, 'bbox')}>绘制矩形</Button>
            <Button onClick={this.handleRenderLabel.bind(this, 'polygon')}>绘制多边形</Button>
            <Button type="primary" onClick={this.handleSaveROI}>提交</Button>
            <div>
              {pBoxList.length > 0 && <div>
                <p>ROI框坐标点</p>
                {
                  pBoxList.map((bbox) => {
                    return <p>{`左上：${bbox[0]}，右下：${bbox[1]}`}</p>
                  })
                }
              </div>}
              {pPolygonList.length > 0 && <div>
                <p>多边形框坐标点</p>
                {
                  pPolygonList.map((bPolygon, index) => {
                    return <span>
                      <p>{`${index + 1}: `}</p>
                      <p>{`${bPolygon.join(', ')}`}</p>
                    </span>

                  })
                }
              </div>}
              {
                pixelOrigin && !!pixelOrigin.x && <div>
                  <p>初始坐标点</p>
                  <p>{`${pixelOrigin.x}   ，  ${pixelOrigin.y}`}</p>
                </div>
              }
            </div>
          </Col>
        </Row>
      </div>
    )
  }
}


