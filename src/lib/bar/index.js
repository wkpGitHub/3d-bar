import Bar from "./bar"
import BarHoriz from "./bar-horiz"
import BarLoop from "./bar-loop"

function createBar(el, opts) {
  if (opts.xAxis?.type === 'category') {
    return new Bar(el, opts)
  } else if (opts.yAxis?.type === 'category') {
    return new BarHoriz(el, opts)
  } else if (opts.radiusAxis) {
    return new BarLoop(el, opts)
  }
}

export {
  createBar,
  Bar,
  BarHoriz,
  BarLoop
}
