import freeice from 'freeice'



// class WebRtcPeer {
//   constructor () {
//     // init rtc peer connection
//     this.pc = new RTCPeerConnection(freeice())
//     this.pc.onaddstream = 
//     this.pc.onicecandidate = 
//   }
// }
export function initPeerConnection (options) {
  let {onicecandidate} = options
  console.log(freeice())
  const pc = new RTCPeerConnection(freeice())
  pc.onaddstream = evt => {
    console.log(evt)
  }

  pc.onicecandidate = onicecandidate

  return pc
}