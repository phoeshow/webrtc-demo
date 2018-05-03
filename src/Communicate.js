import React from 'react'
import { initPeerConnection } from './utils/webrtc-utils'

const WEBSOCKET_URL = 'wss://192.168.18.26:8890/call'
const socket = new WebSocket(WEBSOCKET_URL)


let pc = null
let container = null

socket.onmessage = msg => {
  console.log('接收到消息: ', msg.data)
  let message = JSON.parse(msg.data)

  switch (message.id) {
    case 'iceCandidate':
      if (!message.candidate) return
      pc.addIceCandidate(new RTCIceCandidate(message.candidate))
      break
    case 'incomingCall':
      pc = initPeerConnection({ onicecandidate })
      var options = {
        type: 'offer',
        sdp: message.sdpOffer
      }
      pc.setRemoteDescription(new RTCSessionDescription(options)).then(() => {
        console.log(pc.getRemoteStreams())
        // container.refs['reciver'].srcObject = pc.getRemoteStreams()[0]
        container.setState({ reciver: URL.createObjectURL(pc.getRemoteStreams()[0])})
      })
      break
    case 'callResponse':
      var options = {
        type: 'answer',
        sdp: message.sdpAnswer
      }
      let answer = new RTCSessionDescription(options)

      pc.setRemoteDescription(answer).then(() => {
        console.log(pc.getRemoteStreams())
        container.setState({ reciver: URL.createObjectURL(pc.getRemoteStreams()[0]) })
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

function onicecandidate ({candidate}) {
  console.log(candidate)
  if(!candidate) return
  sendMessage({
    id: 'onIceCandidate',
    candidate: candidate
  })
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

    pc = initPeerConnection({
      onicecandidate
    })

    navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true
    }).then(stream => {
      // 获取本地流后  创建offer
      this.setState({ sender: URL.createObjectURL(stream) })
      let createOfferOptions = {
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      }
      
      stream.getTracks().forEach(track => pc.addTrack(track, stream))
      pc.createOffer(createOfferOptions).then(offer => {
        // 创建好offer 设置des
        return pc.setLocalDescription(offer)
      }).then(() => {
        // 设置好des后 从des里去到offersdp
        let offerSdp = pc.localDescription.sdp
        // 发送播叫信息  连同 offersdp一起发送，  然后等着监听到 callResponse
        sendMessage({
          id: 'call',
          from: this.state.username,
          to: this.state.to,
          sdpOffer: offerSdp
        })
      }).catch(err => {
        console.log(err)
      })
    })
    
  }
  _handleCallRegisterClick = e => {
    sendMessage({
      id: 'register',
      name: this.state.username
    })
  }

  _handleAcceptBtnClick = e => {


    
    navigator.mediaDevices.getUserMedia({audio: true, video: true})
      .then(stream => {
        
        let createAnswerOptions = {
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        }

        // this.setState({sender: stream})
        this.setState({sender: URL.createObjectURL(stream)})
        stream.getTracks().forEach(track => pc.addTrack(track, stream))
        pc.createAnswer(createAnswerOptions).then(answer => {
          console.log(answer)
          return pc.setLocalDescription(answer)
        }).then(() => {
          let answerSdp = pc.localDescription.sdp

          sendMessage({
            id: 'incomingCallResponse',
            from: '2',
            to: '1',
            sdpAnswer: answerSdp
          })
        }).catch(err => {
          console.error(err)
        })
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