<template>
  <div class="container" ref="container">

  </div>
</template>

<script setup>
import * as THREE from 'three'
import {ref, onMounted } from 'vue'
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls'
const container = ref(null)

// 场景
const scene = new THREE.Scene()


// 相机
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 1, 100)
camera.position.set(0, 0, 0.1)
scene.add(camera)

// 物体
const geo = new THREE.BoxGeometry(10,10,10)
geo.scale(1, 1, -1)
const pics = ['r.jpg', 'l.jpg', 'u.jpg', 'd.jpg', 'f.jpg', 'b.jpg'];
const matrils = []
const textureLoader = new THREE.TextureLoader()
pics.forEach(p => {
  const l = textureLoader.load(`./imgs/vr/${p}`)
  matrils.push(new THREE.MeshBasicMaterial({map: l}))
})

const mesh = new THREE.Mesh(geo, matrils)

scene.add(mesh)

// 渲染器
const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)

// 创建轨道控制器, 相机围绕 物体 旋转 查看，好像卫星围绕 地球 查看
const controls = new OrbitControls(camera, renderer.domElement)
// 设置控制器有阻尼（惯性），让操作更真实
controls.enableDamping = true

function render() {
  controls.update()
  renderer.render(scene, camera)
  requestAnimationFrame(render)
}

onMounted(() => {
  container.value.appendChild(renderer.domElement)
  render()
})

</script>


