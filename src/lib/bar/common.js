import * as THREE from 'three'
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { CSS3DRenderer, CSS3DObject } from "three/examples/jsm/renderers/CSS3DRenderer"

// 计算出一个可以被整除的刻度
function getIntNum(data) {
  if (data >= 1) {
    const length = String(Math.ceil(data)).length - 1
    const c = '1' + Array.from({length}).fill('0').join('')
    data = Math.ceil(data / Number(c)) * Number(c)
  } else {
    let length = String(data).length - 4
    length = length >= 1 ? length : 1
    const c = '1' + Array.from({length}).fill('0').join('')
    data = Math.ceil(data * Number(c)) / Number(c)
  }
  return data
}

// 获取y轴最大值
export function getMaxAndMin(allData) {
  var maxData = Math.max(...allData)
  var minData = Math.min(...allData)
  // 所有数据都为正数
  if (maxData >= 0 && minData >= 0) {
    maxData = getIntNum(maxData)
    minData = 0
  }
  // 数据有正数有负数
  else if (maxData >= 0 && minData < 0) {
    // 这里要计算正数和负数占用高度的比例，以0为中间值
    maxData = getIntNum(maxData)
    minData = -getIntNum(-minData)
    const tick = 4
    // 正负两端空间，哪个更多，以更多的为分割刻度为准
    if (maxData >= Math.abs(minData)) {
      // 每个刻度间距是多少
      let tickNum = maxData / tick
      for (let i = 0; i <= tick; i ++) {
        if (tickNum * i >= Math.abs(minData)) {
          minData = - tickNum * i
          break
        }
      }
    } else {
      // 每个刻度间距是多少
      let tickNum = Math.abs(minData) / tick
      for (let i = 0; i <= tick; i ++) {
        if (tickNum * i >= maxData) {
          maxData = tickNum * i
          break
        }
      }
    }

  }
  // 所有数据都为负数
  else {
    maxData = 0
    minData = -getIntNum(-minData)
  }
  return { maxData, minData }
}

export function transfromSeries(series) {
  // 这里是为了计算堆叠图的，原始高度和y轴偏移量，要用的数据；原始高度就是原始数据originData。y轴偏移量就是data[index]总高度 - 原始高度originData[index]
  let lastStackData = {}
  series.forEach(item => {
    item.originData = [...item.data]
    if (item.stack) {
      item.data.forEach((d,i) => {
        item.data[i] +=  (lastStackData[item.stack]?.[i] || 0)
      })
      lastStackData[item.stack] = item.data
    }
  })
}

export function getSeriesStackNum(series) {
  const stackNames = {}
  series.forEach((item, i) => {
    stackNames[item.stack || i] = true
  })
  return Object.keys(stackNames).length
}

function getColors (color) {
  const c = new THREE.Color(color)
  const originRGB = {
    r: c.r,
    g: c.g,
    b: c.b
  }
  const hls = c.getHSL(originRGB)
  c.setHSL(hls.h, hls.s, hls.l * 0.56)

  return {
    ...originRGB,
    r2: c.r,
    g2: c.g,
    b2: c.b
  }
}

function verticalBufferAttribute(color) {
  const colors = []
  const {r, g, b, r2, g2, b2} = getColors(color)
  for (let right=0; right < 4; right++) {
    right < 2 ? colors.push(r,g,b) : colors.push(r2,g2,b2)
  }
  for (let l=0; l < 4; l++) {
    l < 2 ? colors.push(r,g,b) : colors.push(r2,g2,b2)
  }
  for (let u=0; u < 4; u++) {
    colors.push(r,g,b)
  }
  for (let d=0; d < 4; d++) {
    colors.push(r2,g2,b2)
  }
  for (let f=0; f < 4; f++) {
    f < 2 ? colors.push(r,g,b) : colors.push(r2,g2,b2)
  }
  for (let back=0; back < 4; back++) {
    back < 2 ? colors.push(r,g,b) : colors.push(r2,g2,b2)
  }
  return new THREE.Float32BufferAttribute(colors, 3)
}

function horizBufferAttribute(color) {
  const colors = []
  const {r, g, b, r2, g2, b2} = getColors(color)
  for (let right=0; right < 4; right++) {
    colors.push(r,g,b)
  }
  for (let l=0; l < 4; l++) {
    colors.push(r2,g2,b2)
  }
  for (let u=0; u < 4; u++) {
    u % 2 ? colors.push(r,g,b) : colors.push(r2,g2,b2)
  }
  for (let d=0; d < 4; d++) {
    d % 2 ? colors.push(r,g,b) : colors.push(r2,g2,b2)
  }
  for (let f=0; f < 4; f++) {
    f % 2 ? colors.push(r,g,b) : colors.push(r2,g2,b2)
  }
  for (let back=0; back < 4; back++) {
    back % 2 ? colors.push(r,g,b) : colors.push(r2,g2,b2)
  }
  return new THREE.Float32BufferAttribute(colors, 3)
}

export function createBufferAttribute(color, isHoriz) {
  return isHoriz ? horizBufferAttribute(color) : verticalBufferAttribute(color)
}

export const commonOpts = {
  legend: {
    show: true,
    data: []
  },
  grid: {
    left: 80,
    right: 20,
    top: 20,
    bottom: 80,
  },
  grid3D: {
    background: {
      show: true,
      opacity:0.1,
      color: '#fff'
    },
    boxWidth: null,
    // barWidth: '25%',
    // barGap: 20,
    barAngle: 0,
    minZoom: 4, // 最小缩放比例
    maxZoom: 4 // 最大缩放比例
  },
  xAxis: {
    show: true,
    axisLabel: {
      show: true,
      fontSize: 20,
      color: '#999'
    },
    axisLine: {
      show: true,
      lineStyle: {
        color: '#999',
        width: 1
      }
    },
    splitLine: {
      show: true,
      lineStyle: {
        color: '#999',
        width: 1
      }
    },
    data: []
  },
  yAxis: {
    show: true,
    axisLabel: {
      show: true,
      fontSize: 20,
      color: '#999'
    },
    axisLine: {
      show: true,
      lineStyle: {
        color: '#999',
        width: 1
      }
    },
    splitLine: {
      show: true,
      lineStyle: {
        color: '#999',
        width: 1
      }
    }
  },
  color: ['#2a9cff', '#27e89e', '#ffd938', '#eb55f7', '#3864ff', '#ff4069', '#aa8afb', '#ffaa63']
}

export default class BarCommon {
  addScene() {
    this.scene = new THREE.Scene()
    this.textScene = new THREE.Scene()
    const oldSceneFn = this.scene.add
    this.scene.add = (v) => {
      // 排除照相机和灯光
      if (!(v.isCamera || v.isLight)) {
        this.sceneChildren.push(v)
      }
      oldSceneFn.call(this.scene, v)
    }
    const oldTextSceneFn = this.textScene.add
    this.textScene.add = (v) => {
      this.textSceneChildren.push(v)
      oldTextSceneFn.call(this.textScene, v)
    }
    // this.scene.add(new THREE.AxesHelper(1000))
  }

  addLight() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.5))
    const light = new THREE.DirectionalLight()
    light.position.set(-this.canvasWidth, this.canvasHeight, Math.max(this.canvasWidth, this.canvasHeight) * 1.5)
    this.scene.add(light)
  }

  addCamera() {
    // 照相机
    this.camera = new THREE.PerspectiveCamera(30, this.canvasWidth / this.canvasHeight, 0.1, 60000)
    // 照相机角度是30°，所以要算 15° 下，z轴的距离 Math.sin(Math.PI/12)
    if (this.canvasWidth > this.canvasHeight) {
      this.camera.position.set(0, 0, Math.min(this.canvasWidth, this.canvasHeight) / Math.sin(Math.PI / 12))
    } else {
      this.camera.position.set(0, 0, Math.max(this.canvasWidth, this.canvasHeight) / Math.sin(Math.PI / 12))
    }
    this.camera.position.set(0, 0, this.canvasHeight / Math.sin(Math.PI / 12))
    // camera.scale /= 0.8
    // camera.lookAt(scene.position)
    this.scene.add(this.camera)
  }

  addRenderer() {
    const {canvasWidth, canvasHeight} = this
    // 柱形图 渲染器
    this.renderer = new THREE.WebGLRenderer({
      antialias: true, // 是否执行抗锯齿。默认为false.
      alpha: true
    })
    this.renderer.setSize(canvasWidth, canvasHeight)
    this.el.appendChild(this.renderer.domElement)

    // 坐标轴文字渲染器
    this.textRenderer = new CSS3DRenderer()
    this.textRenderer.domElement.style.position = 'absolute'
    this.textRenderer.domElement.style.top = 0
    this.textRenderer.domElement.style.fontSize = '20px'
    this.textRenderer.setSize(canvasWidth, canvasHeight)
    this.el.appendChild(this.textRenderer.domElement)
  }

  addControls() {
    // 创建轨道控制器, 相机围绕 物体 旋转 查看，好像卫星围绕 地球 查看
    this.controls = new OrbitControls(this.camera, this.textRenderer.domElement)
    // 设置控制器有阻尼（惯性），让操作更真实
    this.controls.enableDamping = true
    this.setZoom()
  }

  setZoom() {
    const {opts: {grid3D}, camera, controls} = this
    const distance = camera.position.z
    controls.minDistance = distance / grid3D.maxZoom // 放大
    controls.maxDistance = distance * grid3D.minZoom // 缩小
  }

  onPointerMove = (event) => {
    const {x, y} = this.el.getBoundingClientRect()
    let {pointer, TIPDOM} = this
    pointer.x = ((event.clientX - x) / this.canvasWidth) * 2 - 1
    pointer.y = - ((event.clientY - y) / this.canvasHeight) * 2 + 1
    if (this.INTERSECTED && this.INTERSECTED.material.opacity !== 0) {
      const {itemData} = this.INTERSECTED
      if (TIPDOM) {
        Object.assign(TIPDOM.style, {top: `${event.clientY + 16}px`, left: `${event.clientX + 16}px`, display: 'block'})
        TIPDOM.innerHTML = `<div style="font-weight: bold">${itemData.x}</div>${itemData.name}: ${itemData.y}`
      } else {
        this.TIPDOM = document.createElement('div')
        this.TIPDOM.innerHTML = `<div style="font-weight: bold">${itemData.x}</div>${itemData.name}: ${itemData.y}`
        Object.assign(this.TIPDOM.style, {
          background: '#fff',
          position: 'fixed',
          top: `${event.clientY + 16}px`,
          left: `${event.clientX + 16}px`,
          borderRadius: '4px',
          padding: '10px',
          color: '#333',
          zIndex: 2000
        })
        document.body.appendChild(this.TIPDOM)
      }
    } else {
      if (TIPDOM) TIPDOM.style.display = 'none'
    }
  }

  // 销毁实例
  destory() {
    // 销毁场景中的所有对象
    this.scene.children.forEach(c => this.scene.remove(c))
    this.textScene.children.forEach(c => this.textScene.remove(c))
    // 删除场景

    // 解绑事件
    this.resizeObser.disconnect()
    this.el.removeEventListener('mousemove', this.onPointerMove)

    // 销毁renderer的dom
    this.textRenderer.domElement.remove()
    this.renderer.clear()
    this.renderer.domElement.remove()
    this.TIPDOM?.remove()
  }

  clear () {
    while(this.sceneChildren.length) {
      let child = this.sceneChildren.pop()
      this.scene.remove(child)
    }
    while(this.textSceneChildren.length) {
      let child = this.textSceneChildren.pop()
      this.textScene.remove(child)
    }
    this.textRenderer.domElement.children[0].replaceChildren()
  }

  render = () => {
    let {raycaster, camera, scene, textScene, controls, pointer} = this
    raycaster.setFromCamera(pointer, camera)
    const intersects = raycaster.intersectObjects(scene.children.filter(item => item.isGroup), true)

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

  createLendged() {
    const { legend, color } = this.opts
    if (!legend.show) return false
    const outElement = document.createElement('div')
    const ulElement = document.createElement('ul')
    Object.assign(ulElement.style, {display: 'flex'})
    let currentMesh = []
    legend.data.forEach((d, i) => {
      const liElement = document.createElement('li')
      Object.assign(liElement.style, {alignItems: 'center', marginRight: '48px', color: '#999', display: 'flex', fontSize: '30px', cursor: 'pointer', flexShrink: 0})
      liElement.innerHTML = `<div style="width: 24px; height: 24px; background: ${color[i % color.length]}; margin-right: 8px;"></div>${legend.data[i]}`
      ulElement.appendChild(liElement)
      liElement.addEventListener('mouseenter', (e) => {
        let type = e.target.textContent
        let groups = this.scene.children.filter(item => item.isGroup)
        groups.forEach(g => {
          g.children.forEach(m => {
            if (m.itemData.name === type) {
              currentMesh.push(m)
              m.hex = m.material.color
            }
          })
        })
        currentMesh.forEach( m => m.material.color = new THREE.Color(0xff0000))
      })
      liElement.addEventListener('mouseleave', () => {
        currentMesh.forEach( m => m.material.color = m.hex)
        currentMesh = []
      })
    })
    outElement.appendChild(ulElement)
    const object = new CSS3DObject( outElement )
    object.position.set(0, -this.canvasHeight+40, 0)
    object.isLegend = true
    this.textScene.add( object )
  }

  getColor(i) {
    const { color } = this.opts
    return color[i % color.length] || '#2a9cff'
  }
}