<template>
  <div id="#app">
    <center><h2>

      <RouterLink to="/">vr</RouterLink>&ensp;
      <RouterLink to="/bar">bar</RouterLink>
    </h2></center>
  </div>
  <router-view />
</template>

<script>
export default {}
</script>

<style>
* {
  padding: 0;
  margin: 0;
}
html,body{
  overflow: hidden;
}
.container{
  width: 100vw;
  height: 100vh;
}
</style>
