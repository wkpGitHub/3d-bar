import * as THREE from 'three'
import { scaleLinear, scaleBand } from 'd3-scale'
import { CSS3DObject } from "three/examples/jsm/renderers/CSS3DRenderer"
import BarCommon, {transfromSeries, getMaxAndMin, getSeriesStackNum, commonOpts, createBufferAttribute} from './common'
import _ from 'lodash'

export default class BarHoriz extends BarCommon{
  constructor(el, opts={}) {
    super()
    this.el = el
    el.style.position = 'relative'
    this.opts = _.merge({}, commonOpts, opts)
    const {grid3D, yAxis, series} = this.opts
    // 画布的宽高
    this.canvasWidth = el.clientWidth
    this.canvasHeight = el.clientHeight
    // 3d柱形图绘制的宽度
    this.xAxixWidth = grid3D.boxWidth || this.canvasWidth
    // 类目的数据
    this.yData = yAxis.data
    // 对series数据进行处理转换，用于堆叠图
    transfromSeries(series)
    this.setMaxAndMin()

    this.INTERSECTED = null
    this.TIPDOM = null
    this.raycaster = new THREE.Raycaster()
    this.pointer = new THREE.Vector2()

    this.sceneChildren = []
    this.textSceneChildren = []
    this.seriesStackNum = getSeriesStackNum(series)

    this.init()
  }

  init() {
    this.createScale()
    this.addScene()
    this.addLight()
    this.addCamera()
    this.createLendged()
    this.createYAxis()
    this.createXAxis()
    this.createBgPlane()
    // 创建柱形图
    this.createBarGroup()
    this.addRenderer()
    this.addControls()
    this.render()
    this.el.addEventListener('mousemove', this.onPointerMove)
    this.el.addEventListener('mouseleave', () => {
      if (this.TIPDOM) this.TIPDOM.style.display = 'none'
    })
    this.resize()
  }

  update(opts = {}) {
    this.opts = _.merge({}, commonOpts, opts)
    this.clear()
    const {grid3D, yAxis, series} = this.opts
    // 3d柱形图绘制的宽度
    this.xAxixWidth = grid3D.boxWidth || this.canvasWidth
    // 类目的数据
    this.yData = yAxis.data
    // 还原老数据
    series.forEach(item => {
      if (item.originData) {
        item.data = item.originData
      }
    })
    // 对series数据进行处理转换，用于堆叠图
    transfromSeries(series)
    this.setMaxAndMin()
    this.seriesStackNum = getSeriesStackNum(series)
    this.createScale()

    this.createLendged()
    this.createYAxis()
    this.createXAxis()
    this.createBgPlane()
    // 创建柱形图
    this.createBarGroup()
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
    var allData = []
    this.opts.series.forEach(item => {
      allData = allData.concat(item.data)
    })
    const d = getMaxAndMin(allData)
    this.maxData = d.maxData
    this.minData = d.minData
  }

  // 计算柱形图的宽度 和 柱形图之间的间隔距离
  getBarWidth () {
    // TODO: 这里可以自动计算宽度，和间距。根据series.length
    let barW = 100 / this.seriesStackNum / 2 + '%'
    let {barWidth=barW, barGap=0} = this.opts.grid3D
    barWidth = typeof barWidth === 'number' ? barWidth : this.yWidth * 2 * parseFloat(barWidth) / 100
    barGap = typeof barGap === 'number' ? barGap : this.yWidth * parseFloat(barGap) /100
    return {barWidth, barGap}
  }

  // 因设置opts.grid，导致绘制区域上下位置的偏移
  getGripY() {
    return (this.opts.grid.left - this.opts.grid.right) / 2
  }

  createScale() {
    const { grid } = this.opts
    // 这里是数据和容器宽高，做比例换算
    this.yScale = scaleBand().domain(this.yData).range([-this.canvasHeight + grid.bottom*2, this.canvasHeight - grid.top*2])
    // 这里yScale相对于屏幕是被放大了两倍，所以 yScale.bandwidth() / 2，才是两个柱子“左侧到左侧”的间距
    this.yWidth = this.yScale.bandwidth() / 2
    this.xScale = scaleLinear().domain([this.minData, this.maxData]).range([0, (this.xAxixWidth - grid.left - grid.right) * 2])
    this.maxHeight = this.xScale(this.maxData)
    this.zeroHeight = this.xScale(0)
  }

  createXText(text, x, y, z=0) {
    const {maxHeight, opts: {xAxis}} = this
    const element = document.createElement('span')
    element.innerText = text
    element.style.color = xAxis.axisLabel.color
    element.style.fontSize = xAxis.axisLabel.fontSize + 'px'
    const object = new CSS3DObject( element )
    object.position.set(-maxHeight/2 + x - this.getGripY(), y - 40, z)
    this.textScene.add( object )
  }

  // 添加y轴
  createYAxis() {
    const {yScale, scene, yData, maxHeight, yWidth, opts: {yAxis}} = this
    if (!yAxis.show) return false

    // x轴坐标线
    if (yAxis.axisLine.show) {
      const points = []
      points.push( new THREE.Vector3( -maxHeight/2 - this.getGripY(), yScale( yData[0]), 0 ) )
      points.push( new THREE.Vector3( -maxHeight/2 - this.getGripY(), yScale(yData[yData.length-1]) + yWidth * 2, 0 ) )
      const geometry = new THREE.BufferGeometry().setFromPoints( points )
      const line = new THREE.Line( geometry, new THREE.LineBasicMaterial({
        color: yAxis.axisLine.lineStyle.color,
        linewidth: yAxis.axisLine.lineStyle.width
      }) )
      scene.add( line )
    }

    // y轴标签文字
    if (yAxis.axisLabel.show) {
      yData.forEach(item => {
        this.createYText(item, yScale(item) + yWidth)
      })
    }
  }

  /**
   *
   * @param {*} text 数据
   * @param {*} y 数据在y轴的偏移量
   */
  createYText(text, y) {
    const {maxData, maxHeight, textScene, opts: {yAxis}} = this
    const element = document.createElement('span')
    const width = String(maxData).length * yAxis.axisLabel.fontSize * 2
    element.style.width = width + 'px'
    element.style.textAlign = 'right'
    element.style.color = yAxis.axisLabel.color
    element.style.fontSize = yAxis.axisLabel.fontSize + 'px'
    element.innerText = text
    const object = new CSS3DObject( element )
    // xScale(yData[0]) - width / 2，是刚好靠到y轴。再偏移20。
    object.position.set(-maxHeight/2 - width / 2 - this.getGripY() - 20, y , 0)
    textScene.add( object )
  }

  /**
   * 添加y轴分割线
   * @param {*} isDashed 是否为虚线
   */
  createXSplitLine(x, isDashed) {
    const {yScale, yData, maxHeight, yWidth, scene, opts: {xAxis}} = this
    if (!xAxis.splitLine.show) return false
    const {barWidth} = this.getBarWidth()
    const points = []
    const y = yScale(yData[0]), axisX = -maxHeight/2 - this.getGripY() + x
    points.push( new THREE.Vector3(axisX, y,  0 ) )
    points.push( new THREE.Vector3(axisX, y, 0 ) )
    points.push( new THREE.Vector3(axisX, y, -barWidth*2 ) )
    points.push( new THREE.Vector3(axisX, yScale(yData[yData.length-1]) + yWidth * 2, -barWidth*2 ) )
    const geometry = new THREE.BufferGeometry().setFromPoints( points )

    const line = new THREE.Line( geometry, isDashed ? new THREE.LineDashedMaterial({color: xAxis.splitLine.lineStyle.color, dashSize: 1}) : new THREE.LineBasicMaterial({color: xAxis.splitLine.lineStyle.color}))
    line.computeLineDistances()//不可或缺的，若无，则线段不能显示为虚线
    scene.add( line )
  }

  createMarkLine(num, seriesIndex) {
    const {yScale, xScale, yData, maxHeight, scene, yWidth, opts: {xAxis}} = this
    const x = xScale(num), y = yScale(yData[0]), y2 = yScale(yData[yData.length - 1]) + yWidth * 2
    const points = []
    points.push( new THREE.Vector3(-maxHeight/2  - this.getGripY() + x, y, 0 ) )
    points.push( new THREE.Vector3(-maxHeight/2  - this.getGripY() + x, y2, 0 ) )
    const geometry = new THREE.BufferGeometry().setFromPoints( points )
    const line = new THREE.Line( geometry, new THREE.LineDashedMaterial({color: this.getColor(seriesIndex), dashSize: 1}))
    line.computeLineDistances()//不可或缺的，若无，则线段不能显示为虚线
    scene.add( line )
    this.createXText(num,  x, y2 + xAxis.axisLabel.fontSize * 3)
  }

  // 添加x轴
  createXAxis() {
    const {yScale, yData, maxHeight, scene, opts: {xAxis}} = this
    if (!xAxis.show) return false
    // x轴线
    if (xAxis.axisLine.show) {
      const yPoints = []
      yPoints.push( new THREE.Vector3( -maxHeight/2 - this.getGripY(), yScale(yData[0]), 0 ) )
      yPoints.push( new THREE.Vector3( maxHeight/2 - this.getGripY(), yScale(yData[0]), 0 ) )
      const yLine = new THREE.Line( new THREE.BufferGeometry().setFromPoints( yPoints ), new THREE.LineBasicMaterial({
        color: xAxis.axisLine.lineStyle.color,
        linewidth: xAxis.axisLine.lineStyle.width
      }))
      scene.add( yLine )
    }
    // x轴文字和刻度线
    this.addYText()
  }

  addYText() {
    const {maxData, minData, yScale, xScale, yData, opts: {yAxis}} = this
    let tick = 4, tickNum = 0
    if (maxData >= 0 && minData === 0) {
      tickNum = maxData / tick
    } else if (maxData > 0 && minData < 0) {
      let negativeTick = 4
      // 正负两端空间，哪个更多，以更多的为分割刻度为准
      if (maxData >= Math.abs(minData)) {
        // 每个刻度间距是多少
        tickNum = maxData / tick
        negativeTick = Math.abs(minData) / tickNum
      } else {
        // 每个刻度间距是多少
        tickNum = Math.abs(minData) / negativeTick
        tick = maxData / tickNum
      }
      for (let i=0; i <= negativeTick; i++) {
        const num = -(i * tickNum * 10000000000) / 10000000000
        if (yAxis.axisLabel.show) this.createXText(num, xScale(num), yScale(yData[0]))
        this.createXSplitLine(xScale(num), i > 0)
      }
    } else if (maxData === 0 && minData < 0) {
      tickNum = minData / tick
    }

    for (let i=0; i <= tick; i++) {
      const num = (i * tickNum * 10000000000) / 10000000000
      if (yAxis.axisLabel.show) this.createXText(num, xScale(num), yScale(yData[0]))
      this.createXSplitLine(xScale(num), i > 0)
    }
  }

  // 添加背景墙
  createBgPlane() {
    const {yData, maxHeight, scene, yWidth, opts: {grid, grid3D}} = this
    if (!grid3D.background.show) return false
    const {barWidth} = this.getBarWidth()
    const bgPlane = new THREE.PlaneGeometry(maxHeight, yWidth * 2 * yData.length)
    const materialOpts = {transparent: true, side: THREE.DoubleSide, ...grid3D.background}
    delete materialOpts.show // 删除这个属性，防止控制台警告
    const bgMesh = new THREE.Mesh(bgPlane, new THREE.MeshStandardMaterial(materialOpts))
    bgMesh.position.set(-this.getGripY(), grid.bottom-grid.top, -barWidth*2)
    scene.add(bgMesh)
  }

  /**
   * 物体：创建柱形图
   * @param {*} drawIndex 应该绘制柱形图到x轴哪个位置
   * @param {*} seriesIndex 当前绘制的柱形图，是opt.series中的哪个索引
   * @param {*} i 柱形图的高度
   * @param {*} y 柱形图y轴偏移量
   * @returns
   */
  createBar (drawIndex, seriesIndex, i) {
    const {yData, maxHeight, zeroHeight, xScale, opts} = this
    const {barWidth, barGap} = this.getBarWidth()
    const {itemStyle={}, data = [], originData = [], name} = opts.series[seriesIndex]
    // 柱形图的高度
    const height = xScale(originData[i])
    // 柱形图y轴偏移量
    const y = xScale(data[i] - originData[i])
    // 相对于数据0的高度
    const relativeHeight = height - zeroHeight
    const geometry = new THREE.BoxGeometry(Math.abs(relativeHeight), barWidth, barWidth)
    geometry.setAttribute('color', createBufferAttribute('#fff', true))
    const material = new THREE.MeshLambertMaterial({ color: this.getColor(seriesIndex), vertexColors: true, transparent: true, ...itemStyle })
    const bar = new THREE.Mesh(geometry, material)
    // maxHeight - relativeHeight: y轴总高度 - 柱体相对0的高度，就是剩余空间的高度；再除以2，向下偏移剩余高度的一半高度，到达y轴最底部。
    // 再加上y，这时候的y是yScale(0),也就是zeroHeight的高度.就把所有柱形图，移动到y轴数据为0的位置
    bar.position.set(-(maxHeight - relativeHeight) / 2 + y - this.getGripY(), drawIndex * (barWidth + barGap),  0)
    bar.itemData = {
      x: yData[i],
      y: originData[i],
      name
    }
    if (opts.grid3D.barAngle) {
      bar.rotation.x = Math.PI * opts.grid3D.barAngle / 180
    }
    return bar
  }

  // 创建分组
  createBarGroup() {
    const {yData, yScale, yWidth, scene, opts} = this
    const stackNames = []
    // 一组柱形图，指的是把所有 x轴类目相同的柱形图，放到一组里面，方便统一计算x轴的偏移量
    const barGrops = Array.from({length: yData.length}, () => new THREE.Group())
    opts.series.forEach((item, seriesIndex) => {
      if (item.markLine) this.createMarkLine(item.markLine.value, seriesIndex)
      // stackNames、drawIndex为了兼容stack堆叠图
      if (!stackNames.find(name => name === item.stack)) {
        if (item.stack) stackNames.push(item.stack)
        else stackNames.push(seriesIndex)
      }
      // drawIndex指，应该绘制柱形图到x轴哪个位置
      const drawIndex = stackNames.findIndex(name => name === (item.stack || seriesIndex) )

      item.data.forEach((d, i) => {
        if (i < barGrops.length) {
          const bar = this.createBar(drawIndex, seriesIndex, i)
          barGrops[i].add(bar)
          // barGrops[i].barNum，指的是一组里面，x轴放了多少列柱形图，堆叠图，堆成一列的算一列
          barGrops[i].barNum = stackNames.length
        }
      })
    })

    // 计算一组柱形图的x轴偏移量，并且把分组加入到scene场景中
    const {barWidth, barGap} = this.getBarWidth()
    barGrops.forEach((g,i) => {
      // 计算一组数据的总平移量
      let gWidth = 0
      Array.from({length: g.barNum}).forEach((mesh, i) => {
        // 要少算一个barGap，最后一个(为了方便计算，这里就直接不算第一个)，不计入
        if (i === 0) {
          gWidth += barWidth
        } else {
          gWidth += (barGap + barWidth)
        }
      })
      const y = yScale(yData[i])
      // 因为分组中的柱形图，是以第一个柱形图居中x轴刻度translateX(-50%)，然后开始往右侧绘制的；所以x是所有分组偏移了半个柱形图的宽度；
      // x + barWidth / 2，刚好对齐x轴刻度；再偏移gWidth / 2，就是所有分组居中对齐x轴刻度，再加上每个刻度的间距xWidth。刚好分布在刻度间距中间
      g.position.set(0, y + barWidth / 2 - gWidth / 2 + yWidth, -barWidth)
      scene.add(g)
    })
  }
}
