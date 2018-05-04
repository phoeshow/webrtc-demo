import React from 'react'
import { WebRtcPeer } from 'kurento-utils'
const WEBSOCKET_URL = 'wss://192.168.18.26:8890/call'
const socket = new WebSocket(WEBSOCKET_URL)

let container = null

let rtcPeer = null

let savedSdpOffer = null

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
      rtcPeer.addIceCandidate(message.candidate, err => {
        if (err) return console.error('Error adding candidate: ', err)
      })
      break
    case 'incomingCall':
      // 保存sdp 设置接收状态
      savedSdpOffer = message.sdpOffer
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
          sender: rtcPeer.getLocalStream(),
          receiver: rtcPeer.getRemoteStream()
        })
        setTimeout(() => {
          container.sender.current.srcObject = container.state.sender
          container.receiver.current.srcObject = container.state.receiver
        }, 0);
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
  sendMessage(message)
}

export default class Communicate extends React.Component {
  state = {
    username: '',
    to: '',
    incoming: false,
    sender: null,
    receiver: null
  }

  sender = React.createRef()
  receiver = React.createRef()

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
      sendMessage(message)
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
    const sendAnswer = (err, sdpAnswer) => {
      if (err) {
        return console.error('Error generating the offer', err)
      }
      let message = { 
        id: 'incomingCallResponse',
        from: caller,
        callResponse: 'accept',
        sdpAnswer: sdpAnswer
      }
      sendMessage(message)
      this.setState({
        sender: rtcPeer.getLocalStream(),
        receiver: rtcPeer.getRemoteStream()
      })
      setTimeout(() => {
        this.sender.current.srcObject = this.state.sender
        this.receiver.current.srcObject = this.state.receiver
      }, 0);
    }
    rtcPeer = new WebRtcPeer.WebRtcPeerSendrecv(rtcPeerConfig, err => {
      if (err) return console.error(err)
      rtcPeer.processOffer(savedSdpOffer, sendAnswer)
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
        <video id="sender" ref={this.sender}  autoPlay style={styles.video}></video>
        <video id="reciver" ref={this.receiver} autoPlay style={styles.video}></video>
      </div>
    )
  }
}

const styles = {
  video: {
    width: '200px',
    height: 'auto',
    border: '1px solid #ddd',
    margin: '15px'
  }
}