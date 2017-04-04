import { Component, ChangeDetectorRef } from '@angular/core';
declare var easyrtc: any;
type MediaStream = any;

@Component({
  selector: 'my-app',
  template: `
  <div class="wrapper-app">
  <header>
    <h1>You are: {{myId}}</h1>
    <h3 *ngIf="conferenceStarted">Conference started{{headingConference() ? " by you" : ""}}</h3>
    <div *ngIf="!conferenceStarted || headingConference()" class="sharing-buttons">
      <div *ngIf="!sharingCam()"><button *ngFor="let any of (videoSources); let i = index" (click)="shareCam(videoSources[i])">{{videoSources[i].label}}</button></div>
      <button *ngIf="!sharingScreen()" (click)="shareScreen()">Desktop</button>
    </div>
  </header>
  <div class="wrapper-content"> 
    <div class="video-frames">
      <div class="video-camera"><video id="{{cameraVideoId}}"></video></div>
      <div class="video-screen"><video id="{{screenVideoId}}"></video></div>
    </div>
    <div class="connect-caller-buttons">
      <h3>Connected Clients:</h3>
      <div id="otherClients"><button *ngFor="let easyrtcId of (connectedClientsList)" (click)="performCall(easyrtcId)" disabled>{{easyrtcId}}</button></div>
    </div>
  </div>
  <footer><div>Angular 2 + EasyRTC Conference room</div></footer>
</div>
              `,
})

export class AppComponent {
  constructor(private cdr: ChangeDetectorRef) { }

  readonly cameraStream: string = "cameraStream";
  readonly cameraVideoId: string = "videoCamera";
  readonly screenStream: string = "desktopStream";
  readonly screenVideoId: string = "videoScreen";

  myId: string = '';
  conferenceStarted: boolean;
  conferenceHeadId: string;
  connectedClientsList: Array<string> = [];
  videoSources: Array<any> = [];

  startConference(): void {
    this.conferenceStarted = true;
    this.conferenceHeadId = this.myId;
    this.checkConferenceStatus();
    this.cdr.detectChanges();
  }

  headingConference(): boolean {
    return this.conferenceHeadId == this.myId;
  }
  checkConferenceStatus(): void {
    if (this.headingConference() && this.connectedClientsList.length > 0) {
      this.performAllCalls();
    }
  }

  performCall(clientEasyrtcId: string): void {
    console.log("calling to " + clientEasyrtcId);
    easyrtc.call(clientEasyrtcId, (callingId: string) => {
      console.log("call success");
    }, (errText: string) => {
      console.log("call fail " + errText);
    }, null, easyrtc.getLocalMediaIds());
  }


  performAllCalls(): void {
    console.log("calling to everybody (conference)");
    for (let connectedClientEasyrtcId of this.connectedClientsList) {
      this.performCall(connectedClientEasyrtcId);
    }
  }

  roomOccupantsDidChange(roomName: string, data: any, isPrimary: boolean): void {
    this.connectedClientsList = [];
    for (let connectedClientEasyrtcId in data) {
      this.connectedClientsList.push(easyrtc.idToName(connectedClientEasyrtcId));
    }
    this.checkConferenceStatus();
    this.cdr.detectChanges();
  }

  updateMyEasyRTCId(myEasyRTCId: string): void {
    this.myId = myEasyRTCId;
    this.cdr.detectChanges();
  }

  sharingCam(): boolean {
    for (let localMedia of easyrtc.getLocalMediaIds()) {
      if (localMedia == this.cameraStream) {
        return true;
      }
    }
    return false;
  }
  shareCam(videoSource: MediaDeviceInfo): void {
    console.log("sharing cam " + videoSource.label);

    easyrtc.initMediaSource((stream: MediaStream) => {
      console.log("sharing cam success");
      easyrtc.setVideoObjectSrc(document.getElementById(this.cameraVideoId), stream);
      this.startConference();
    }, (errCode: number, errText: string) => {
      console.log("sharing cam fail: " + errText);
      easyrtc.showError(errCode, errText);
    }, this.cameraStream);
  }

  sharingScreen(): boolean {
    for (let localMedia of easyrtc.getLocalMediaIds()) {
      if (localMedia == this.screenStream) {
        return true;
      }
    }
    return false;
  }
  shareScreen(): void {
    console.log("sharing desktop");

    easyrtc.initDesktopStream((stream: MediaStream) => {
      console.log("sharing screen success");
      easyrtc.setVideoObjectSrc(document.getElementById(this.screenVideoId), stream);
      this.startConference();
    }, (errCode: number, errText: string) => {
      console.log("sharing screen fail: " + errText);
      easyrtc.showError(errCode, errText);
    }, this.screenStream);
  }

  streamUpdated(streamName: string, stream: MediaStream) {
    if (streamName == this.cameraStream) {
      easyrtc.setVideoObjectSrc(document.getElementById(this.cameraVideoId), stream);
    }
    else if (streamName == this.screenStream) {
      easyrtc.setVideoObjectSrc(document.getElementById(this.screenVideoId), stream);
    }
    this.cdr.detectChanges();
  }
  streamAccepted(easyrtcid: string, stream: MediaStream): void {
    this.conferenceStarted = true;
    this.conferenceHeadId = easyrtcid; //wrong way
    this.streamUpdated(stream.streamName, stream);
  }
  streamClosed(stream: MediaStream): void {
    this.streamUpdated(stream.streamName, null);
  }

  connect(): void {
    console.log("initializing EasyRTC");

    easyrtc.setVideoDims(320, 240, undefined);
    easyrtc.setRoomOccupantListener((roomName: string, data: any, isPrimary: boolean): void => {
      this.roomOccupantsDidChange(roomName, data, isPrimary);
    });
    easyrtc.setAutoInitUserMedia(false);
    easyrtc.getVideoSourceList((videoSrcList: any) => {
      console.log("got cams list");
      this.videoSources = videoSrcList;
      this.cdr.detectChanges();
    });

    // easyrtc.setPeerClosedListener((easyrtcid: string) => {
    //   setTimeout(() => {
    //     if (easyrtc.getSlotOfCaller(easyrtcid) >= 0 && easyrtc.isPeerInAnyRoom(easyrtcid)) {
    //       easyrtc.call(easyrtcid, null, null, null);
    //     }
    //   }, 1000);
    // });

    easyrtc.setStreamAcceptor((easyrtcid: string, stream: MediaStream): void => {
      this.streamAccepted(easyrtc, stream);
    });
    easyrtc.setOnStreamClosed((stream: MediaStream): void => {
      this.streamClosed(stream);
    });

    easyrtc.connect("angular-demo", (easyrtcid: string): void => {
      this.updateMyEasyRTCId(easyrtc.cleanId(easyrtcid));
    }, (errorCode: string, message: string): void => {
      this.updateMyEasyRTCId('Login failed. Reason: ' + message);
    });
  }

  ngAfterViewInit() {
    this.connect();
  }
}
