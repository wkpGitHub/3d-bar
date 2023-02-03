<template>
  <div class="bar-container">
    <div ref="bar" style="height: 500px; width: 600px">
      <h4>基础</h4>
    </div>
    <div ref="barGroup" style="height: 500px; width: 600px">
      <h4>分组</h4>
    </div>
    <div ref="barStack" style="height: 500px; width: 600px">
      <h4>堆叠</h4>
    </div>
    <div ref="barSection" style="height: 500px; width: 600px">
      <h4>区间</h4>
    </div>
    <div ref="barAngle" style="height: 500px; width: 600px">
      <h4>自定义柱形图宽度、间距、旋转角度、颜色</h4>
    </div>
    <div ref="barNegative" style="height: 500px; width: 600px">
      <h4>正负数</h4>
    </div>
    <div ref="barHoriz" style="height: 500px; width: 600px">
      <h4>横向柱形图</h4>
    </div>
    <div ref="barLoop" style="height: 500px; width: 600px">
      <h4>环形柱形图</h4>
    </div>
  </div>
</template>

<script>
import {createBar} from '../lib/bar'
export default {
  data() {
    return {}
  },

  mounted() {
    /* 这里就是举一些基本的例子，其他配置选项，请查看echarts的配置选项 */
    // 纵向
    createBar(this.$refs.bar, {
      xAxis: {
        type: 'category',
        data: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
      },
      series: [
        {
          name: 'camera',
          data: [200, 90, 130, 90, 10, 50, 490]
        }
      ]
    })
    createBar(this.$refs.barNegative, {
      xAxis: {
        type: 'category',
        data: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
      },
      series: [
        {
          name: 'camera',
          data: [200, 90, -130, 90, 10, -50, 490]
        }
      ]
    })
    createBar(this.$refs.barGroup, {
      legend: {
        data: ['蓝色', '绿色']
      },
      xAxis: {
        type: 'category',
        data: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
      },
      series: [
        {
          name: '蓝色',
          data: [200, 90, 330, 90, 10, 50, 290]
        },
        {
          name: '绿色',
          data: [100, 290, 130, 290, 110, 50, 490]
        }
      ]
    })
    createBar(this.$refs.barAngle, {
      legend: {
        data: ['蓝色', '绿色']
      },
      xAxis: {
        type: 'category',
        data: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
      },
      grid3D: {
        boxWidth: 500, // 容器宽度
        barWidth: '25%', // 柱子宽度
        barGap: 20, // 柱子之间间距
        barAngle: 45 // 柱子旋转角度
      },
      series: [
        {
          name: '蓝色',
          data: [200, 90, 330, 90, 10, 50, 290],
          itemStyle: {
            opacity: 0.5, // 透明度
            color: '#ff0' // 颜色
          }
        },
        {
          name: '绿色',
          data: [100, 290, 130, 290, 110, 50, 490]
        }
      ]
    })
    createBar(this.$refs.barSection, {
      legend: {
        data: ['蓝色', '绿色']
      },
      grid3D: {
        background: {
          show: false
        }
      },
      xAxis: {
        type: 'category',
        data: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
      },
      series: [
        {
          name: '蓝色',
          data: [200, 90, 330, 90, 10, 50, 290],
          stack: 'total',
          itemStyle: {
            opacity: 0
          }
        },
        {
          name: '绿色',
          data: [100, 290, 130, 290, 110, 50, 490],
          stack: 'total'
        }
      ]
    })
    createBar(this.$refs.barStack, {
      legend: {
        data: ['蓝色', '绿色', '黄色']
      },
      xAxis: {
        type: 'category',
        data: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
      },
      series: [
        {
          name: '蓝色',
          stack: 'total',
          data: [360, 200, 30, 54, 66, 10, 50, 100]
        },
        {
          name: '绿色',
          stack: 'total',
          data: [200, 90, 130, 90, 10, 50, 90, 40]
        },
        {
          name: '黄色',
          stack: 'total',
          data: [120, 30, 200, 190, 110, 150, 40, 140]
        }
      ]
    })
    // 横向
    createBar(this.$refs.barHoriz, {
      legend: {
        data: ['蓝色', 'group', 'render', 'camera']
      },
      grid: {
        top: 20,
        bottom: 60,
      },
      yAxis: {
        type: 'category',
        data: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
      },
      grid3D: {
        barWidth: 30,
        barAngle: 0
      },
      series: [
        {
          name: '蓝色',
          stack: 'total',
          data: [360, 200, 30, 54, 66, 10, 50, 100],
          markLine: {
            value: 200
          }
        },
        {
          name: 'group',
          stack: 'total',
          data: [200, 90, 130, 90, 10, 50, 90, 40]
        },
        {
          name: 'render',
          stack: 'total',
          data: [290, 190, 30, 20, 110, 150, 190]
        },
        {
          name: 'camera',
          data: [200, 90, 130, 90, 10, 50, 490, 40]
        }
      ]
    })
    let opts = {
      radiusAxis: {
        data: ['aaaa', 'b', 'c', 'd'],
      },
      angleAxis: {
        max: 0,
        min: 0,
        startAngle:0
      },
      polar: {
        radius: ['10%', '80%']
      },
      grid3D: {
        barWidth: '50%', // 柱子的宽度
        barDepth: 50, // 柱子的深度
      },
      series: {
        data: [2, 1.2, -2.4, 3.6]
      }
    }
    const bar = createBar(this.$refs.barLoop, opts)
    opts.series = {
      name: '蓝色',
      stack: 'total',
      data: [360, 500, 330, 54, 606, -110, 50],
      markLine: {
        value: 200
      }
    }
    opts.radiusAxis = {
      data: ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    }
    // 更新图例
    setTimeout(() => {
      bar.update(opts)
    }, 2000)
    // // 销毁图例
    // setTimeout(() => {
    //   bar.destory()
    // }, 4000)

  }
}
</script>

<style scoped>
.bar-container{
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-wrap: wrap;
  overflow: auto;
  background-color: #0f131e;
}
.bar-container h4{
  text-align: center;
  position: absolute;
  left: 0;
  right: 0;
  color: #fff;
}
</style>