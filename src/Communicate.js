import React from 'react'
import { initPeerConnection } from './utils/webrtc-utils'
import { WebRtcPeer } from 'kurento-utils'
const WEBSOCKET_URL = 'wss://192.168.18.26:8890/call'
const socket = new WebSocket(WEBSOCKET_URL)



let pc = null
let container = null

let rtcPeer = null

let sdpOffer = null

let caller = ''
let callee = ''

const rtcPeerConfig = {
  onicecandidate: onIceCandidate,
  mediaConstraints: {
    audio: true,
    video: {
      width: 640,
      framerate: 15
    }
  }
}


socket.onmessage = msg => {
  console.log('接收到消息: ', msg.data)
  let message = JSON.parse(msg.data)

  switch (message.id) {
    case 'iceCandidate':
      // if (!message.candidate) return
      // pc.addIceCandidate(new RTCIceCandidate(message.candidate))
      rtcPeer.addIceCandidate(message.candidate, err => {
        if (err) return console.error('Error adding candidate: ', error)
      })
      break
    case 'incomingCall':
      // 保存sdp 设置接收状态
      sdpOffer = message.sdpOffer
      container.setState({ incoming: true })
      caller = message.from
      callee = message.to
      break
    case 'callResponse':
      // 处理返回的结果
      rtcPeer.processAnswer(message.sdpAnswer, err => {
        if (err) {
          return console.error(err)
        }
        container.setState({
          sender: URL.createObjectURL(rtcPeer.getLocalStream()),
          receiver: URL.createObjectURL(rtcPeer.getRemoteStream())
        })
      })
      break
    default: 
      console.error('未定义的消息内容')
  }
  

}

function sendMessage (msg) {
  console.log('Send message: ', JSON.stringify(msg))
  socket.send(JSON.stringify(msg))
}


function onIceCandidate (candidate) {
  let message = {
    id: 'onIceCandidate',
    candidate: candidate
  }
  sendMeseage(message)
}


export default class Communicate extends React.Component {
  state = {
    username: '',
    to: '',
    incoming: false,
    sender: null,
    reciver: null
  }

  componentDidMount () {
    container = this
  }

  _handleChangeUsername = e => {
    this.setState({username: e.target.value})
  }
  _handleChangeTo = e => {
    this.setState({to: e.target.value})
  }
  _handleCallBtnClick = e => {
    const onOfferCall = (err, offerSdp) => {
      if (err) return console.error('Error generating the offer', err)
      console.log('Invoking SDP offer callback function')

      let message = { 
        id: 'call', 
        from: this.state.username, 
        to: this.state.to, 
        sdpOffer: offerSdp
      }
      sendMeseage(message)
    }
    rtcPeer = WebRtcPeer.WebRtcPeerSendrecv(rtcPeerConfig, err => {
      if (err) return console.error(err)
      rtcPeer.generateOffer(onOfferCall)
    })
    
  }
  _handleCallRegisterClick = e => {
    sendMessage({
      id: 'register',
      name: this.state.username
    })
  }

  _handleAcceptBtnClick = e => {
    const onOffer = (err, offerSdp) => {
      if (error) {
        return console.error('Error generating the offer', error)
      }
      let message = { 
        id: 'incomingCallResponse',
        from: caller,
        callResponse: 'accept',
        sdpOffer: offerSdp
      }
      sendMessage(message)
    }
    rtcPeer = new WebRtcPeer.WebRtcPeerSendrecv(rtcPeerConfig, err => {
      if (err) return console.error(err)
      rtcPeer.generateOffer(onoffer)
    })
    
  }


  render () {
    return (
      <div className="communicate">
        <label htmlFor="username">User Name:</label>
        <br/>
        <input type="text" id="username" value={this.state.username} onChange={this._handleChangeUsername}/>
        <hr/>
        <label htmlFor="to">To:</label>
        <br/>
        <input type="text" id="to" value={this.state.to} onChange={this._handleChangeTo} />
        <hr/>
        <button onClick={this._handleCallRegisterClick}>Register</button>
        <button onClick={this._handleCallBtnClick}>Call</button>
        <button onClick={this._handleAcceptBtnClick}>Accept</button>
        {this.state.incoming ? <h1>incoming</h1> : null}
        <hr/>
        <video id="sender" src={this.state.sender}  autoPlay style={styles.video}></video>
        <video id="reciver" src={this.state.reciver} autoPlay style={styles.video}></video>
      </div>
    )
  }
}

const styles = {
  video: {
    width: '200px',
    height: 'auto'
  }
}