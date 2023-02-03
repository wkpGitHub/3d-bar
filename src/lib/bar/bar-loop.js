import * as THREE from 'three'
import { scaleLinear, scaleBand } from 'd3-scale'
import { CSS3DObject } from "three/examples/jsm/renderers/CSS3DRenderer"
import BarCommon, {getMaxAndMin, commonOpts} from './common'
import _ from 'lodash'

const defaultOpts = _.merge({}, commonOpts, {
  radiusAxis: {
    show: true,
    type: 'category',
    data: [],
    axisLabel: {
      show: true,
      fontSize: 20,
      color: '#999'
    }
  },
  angleAxis: {
    max: 0,
    min: 0,
    startAngle:0
  },
  polar: {
    radius: ['10%', '80%']
  },
  series: {
    itemStyle: {}
  }
})

export default class BarLoop extends BarCommon {
  constructor(el, opts={}) {
    super()
    this.el = el
    el.style.position = 'relative'
    this.opts = _.merge({}, defaultOpts, opts)
    const {grid3D, radiusAxis} = this.opts
    // 画布的宽高
    this.canvasWidth = el.clientWidth
    this.canvasHeight = el.clientHeight
    // 3d柱形图绘制的宽度
    this.xAxixWidth = grid3D.boxWidth || this.canvasWidth
    // 类目的数据
    this.xData = radiusAxis.data
    this.setMaxAndMin()

    this.INTERSECTED = null
    this.TIPDOM = null
    this.raycaster = new THREE.Raycaster()
    this.pointer = new THREE.Vector2()

    this.sceneChildren = []
    this.textSceneChildren = []

    this.init()
  }

  init() {
    this.createScale()
    this.addScene()
    this.addLight()
    this.addCamera()
    this.createBar()
    this.addRenderer()
    this.addControls()
    this.render()
    this.el.addEventListener('mousemove', this.onPointerMove)
    this.el.addEventListener('mouseleave', () => {
      if (this.TIPDOM) this.TIPDOM.style.display = 'none'
    })
    this.resize()
  }

  render = () => {
    let {raycaster, camera, scene, textScene, controls, pointer} = this
    raycaster.setFromCamera(pointer, camera)
    const intersects = raycaster.intersectObjects(scene.children.find(item => item.isGroup)?.children?.filter(item => item.isDataItem) || [], true)
    if (intersects.length > 0) {
      if (this.INTERSECTED != intersects[0].object) {

        if (this.INTERSECTED) this.INTERSECTED.material.color = this.INTERSECTED.currentHex

        this.INTERSECTED = intersects[0].object
        this.INTERSECTED.currentHex = this.INTERSECTED.material.color
        this.INTERSECTED.material.color = new THREE.Color(0xff0000)

      }

    } else {
      if (this.INTERSECTED) this.INTERSECTED.material.color = this.INTERSECTED.currentHex
      this.INTERSECTED = null
    }

    controls.update()
    this.renderer.render(scene, camera)
    this.textRenderer.render(textScene, camera)
    requestAnimationFrame(this.render)
  }

  update(opts = {}) {
    this.opts = _.merge({}, defaultOpts, opts)
    this.clear()
    const {grid3D, radiusAxis} = this.opts
    // 3d柱形图绘制的宽度
    this.xAxixWidth = grid3D.boxWidth || this.canvasWidth
    // 类目的数据
    this.xData = radiusAxis.data
    this.setMaxAndMin()
    this.createScale()
    this.createBar()
  }

  resize() {
    this.resizeObser = new ResizeObserver(() => {
      const {renderer, textRenderer, el, camera} = this
      this.canvasWidth = el.clientWidth
      this.canvasHeight = el.clientHeight

      // 设置摄像机视锥体的长宽比，通常是使用画布的宽/画布的高。默认值是1（正方形画布）
      camera.aspect = this.canvasWidth / this.canvasHeight
      // 摄像机大多数属性发生改变之后，需要调用.updateProjectionMatrix来使得这些改变生效。
      camera.updateProjectionMatrix()

      // 设置渲染器尺寸
      renderer.setSize(this.canvasWidth, this.canvasHeight)
      // 设置渲染器的像素比
      renderer.setPixelRatio(window.devicePixelRatio)

      // 设置渲染器尺寸
      textRenderer.setSize(this.canvasWidth, this.canvasHeight)
    })
    this.resizeObser.observe(this.el)
  }

  // 设置最大值和最小值
  setMaxAndMin() {
    const {series, angleAxis} = this.opts
    const d = getMaxAndMin(series.data)
    this.maxData = Math.max(d.maxData, angleAxis.max)
    this.minData = Math.min(d.minData, angleAxis.min)
    if (this.maxData > Math.abs(this.minData)) {
      this.minData = -this.maxData
    } else {
      this.maxData = -this.minData
    }
  }

  // 计算柱形图的宽度 和 柱形图之间的间隔距离
  getBarWidth () {
    const {grid3D, series} = this.opts
    const barW = 100 / (series.data.length || 1) + '%'
    // TODO: 这里可以自动计算宽度，和间距。根据series.length
    let {barWidth=barW} = grid3D
    barWidth = typeof barWidth === 'number' ? barWidth : this.xWidth * 2 * parseFloat(barWidth) / 100
    return barWidth
  }

  createScale() {
    const {opts: {polar: {radius}}} = this
    let startRadius = radius[0], endRadius = radius[1]
    if (typeof startRadius === 'string') startRadius = Math.min(this.xAxixWidth, this.canvasHeight) * parseFloat(startRadius) / 100
    if (typeof endRadius === 'string') endRadius = Math.min(this.xAxixWidth, this.canvasHeight) * parseFloat(endRadius) / 100
    // 这里是数据和容器宽高，做比例换算
    this.xScale = scaleBand().domain(this.xData).range([startRadius, endRadius])
    // 这里xScale相对于屏幕是被放大了两倍，所以 xScale.bandwidth() / 2，才是两个柱子“左侧到左侧”的间距
    this.xWidth = this.xScale.bandwidth() / 2
    this.yScale = scaleLinear().domain([0, this.maxData]).range([0, Math.PI * 2])
    // this.yScale = scaleLinear().domain([this.minData, 0, this.maxData]).range([-Math.PI * 2, 0, Math.PI * 2])
    this.maxHeight = this.yScale(this.maxData)
  }

  createXRadiusText(text, x, y) {
    const {angleAxis, radiusAxis} = this.opts
    const element = document.createElement('span')
    element.style.color = radiusAxis.axisLabel.color
    element.style.fontSize = radiusAxis.axisLabel.fontSize + 'px'
    element.innerText = text
    const object = new CSS3DObject( element )
    y = y < 0 ? radiusAxis.axisLabel.fontSize : -radiusAxis.axisLabel.fontSize
    // TODO: 这里可以根据angleAxis.startAngle，判断文字的排版位置，决定文字的偏移量
    object.position.set(x, y, 0)
    object.rotation.set(0,0, -angleAxis.startAngle / 180 * Math.PI)
    return object
  }

  // 绘制一个二维平面的形状；然后结合ExtrudeGeometry，绘制出有深度的三维形状
  drawLoopShape(outRadius, innerRadius, aStartAngle, aEndAngle ) {
    // 圆心位置
    let originPoint = [0, 0]
    let shape = new THREE.Shape()
    shape.moveTo(originPoint[0], originPoint[1])
    // 外面的圆
    const curOuter = new THREE.EllipseCurve(originPoint[0], originPoint[1], outRadius, outRadius, aStartAngle, aEndAngle)
    // 里面的圆
    const curInner = new THREE.EllipseCurve(originPoint[0], originPoint[1], innerRadius, innerRadius, aStartAngle, aEndAngle)

    const pointsOuter = curOuter.getPoints(1000).reverse()
    const pointsInner = curInner.getPoints(1000)
    // 把绘制笔移动到这个这个位置开始绘制
    shape.moveTo(innerRadius * Math.cos(aStartAngle) + originPoint[0], innerRadius * Math.sin(aStartAngle) + originPoint[1])
    for (const i of pointsInner) {
      shape.lineTo(i.x, i.y)
    }
    // shape.lineTo(radius * Math.cos(aStartAngle) + originPoint[0], radius * Math.sin(aStartAngle) + originPoint[1])
    for (const i of pointsOuter) {
      shape.lineTo(i.x, i.y)
    }
    // shape.lineTo(radius / 2 + originPoint[0], originPoint[1])
    return shape
  }

  // 绘制环形图
  drawCircle(outRadius, innerRadius, startAngle, endAngle, depth = 1, materOpts={}) {
    delete materOpts.show
    let shape = this.drawLoopShape(outRadius, innerRadius, startAngle, endAngle)
    const geometry = new THREE.ExtrudeGeometry(shape, {
      curveSegments: 1000,
      steps: 1,
      depth,
      bevelEnabled: false
    })
    const material = new THREE.MeshLambertMaterial({ transparent: true, depthTest: true, ...materOpts })
    const mesh = new THREE.Mesh(geometry, material)
    return mesh
  }

  createBar() {
    const {xData, xScale, yScale, opts} = this
    const {data} = opts.series
    let loopGroup = new THREE.Group()
    let textGroup = new THREE.Group()
    xData.forEach((item,index) => {
      let innerRadius = xScale(item)
      let outRadius = innerRadius + this.getBarWidth()
      let startAngle = 0, endAngle = yScale(Math.abs(data[index]))
      if (data[index] < 0) {
        startAngle = Math.PI * 2 - endAngle
        endAngle = Math.PI * 2
      }
      let mesh = this.drawCircle(outRadius, innerRadius, startAngle,  endAngle, opts.grid3D.barDepth, {color: opts.color[0], ...opts.series.itemStyle})
      mesh.isDataItem = true
      mesh.itemData = {
        x: xData[index],
        y: data[index],
        name: 'mesh'
      }
      loopGroup.add(mesh)
      loopGroup.add(this.drawCircle(outRadius, innerRadius, 0,  Math.PI * 2, 1, { ...opts.grid3D.background}))
      if (opts.radiusAxis.show && opts.radiusAxis.axisLabel.show) {
        textGroup.add(this.createXRadiusText(item, (innerRadius + outRadius) / 2, data[index]))
      }
    })
    loopGroup.rotation.set(-0.3, 0.2, opts.angleAxis.startAngle / 180 * Math.PI)
    textGroup.rotation.set(-0.3, 0.2, opts.angleAxis.startAngle / 180 * Math.PI)
    this.scene.add(loopGroup)
    this.textScene.add(textGroup)
  }
}
