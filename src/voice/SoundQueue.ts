import {
    AudioPlayer,
    AudioPlayerStatus,
    AudioResource,
    createAudioPlayer,
    entersState,
    VoiceConnection,
    getVoiceConnection,
    VoiceConnectionDisconnectReason,
    VoiceConnectionStatus,
    VoiceConnectionState,
    createAudioResource,
    VoiceConnectionSignallingState,
    VoiceConnectionDisconnectedState,
    VoiceConnectionConnectingState,
    VoiceConnectionReadyState,
    VoiceConnectionDestroyedState,
    StreamType
} from "@discordjs/voice";

import * as fs from 'fs';


const file_dict : {[id: string] : string} = {
    "0" :                 "dummy.mp3"           //dummy
};

export class SoundQueue {
    public readonly audioPlayer: AudioPlayer;
    public voiceConnection!: VoiceConnection;
    public queue: string[];
    public queueLock = false;
    public readyLock = false;
    public secretState = false;


    public constructor() {
        this.audioPlayer = createAudioPlayer();
        this.queue = [];

        this.audioPlayer.on(AudioPlayerStatus.Idle, () => {
            this.processQueue();
        });

        // this.audioPlayer.on('stateChange', (oldState : any, newState: any) => {
        //     console.log(`Audio player state changed from ${oldState.status} to ${newState.status}`);
        // });
    }

    //https://discordjs.guide/voice/life-cycles.html#subscribing-to-individual-events
    public setVoiceConnection(value: VoiceConnection) {
        this.voiceConnection = value;
        this.voiceConnection.subscribe(this.audioPlayer);

        this.voiceConnection.on(VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
            try {
                await Promise.race([
                    entersState(this.voiceConnection, VoiceConnectionStatus.Signalling, 5_000),
                    entersState(this.voiceConnection, VoiceConnectionStatus.Connecting, 5_000),
                ]);
                // Seems to be reconnecting to a new channel - ignore disconnect
            } catch (error) {
                // Seems to be a real disconnect which SHOULDN'T be recovered from
                this.destroy();
            }
        });
    }


    public enqueue(id: string): void {
        console.log(`Enqueuing ${id}`);
        this.queue.push(id);

        console.log(`Queue: ${this.queue}`);

        this.processQueue();
    }

    private async processQueue(): Promise<void> {
        // console.log(this.queueLock ? "Queue locked" : "Queue Unlocked")
        if (this.queueLock || this.audioPlayer.state.status != AudioPlayerStatus.Idle || this.queue.length == 0){
            return;
        }

        this.queueLock = true;

        const nextID = this.queue.shift()!;

        try {
            if(!(nextID in file_dict)){
                throw new Error(`ID ${nextID} not found in file_dict`);
            }

            let base = this.secretState ? "./voice/sounds/secret/" : "./voice/sounds/";
            let path = base + file_dict[nextID];

            if(!fs.existsSync(path)){
                base = "./voice/sounds/";
                path = base + file_dict[nextID];
            }
            

            const resource = createAudioResource(path,{});
            this.audioPlayer.play(resource);

            console.log("Playing " + path);

            this.queueLock = false;
            
        } catch (error) {
            console.log(error)
            console.log("error")
            this.queueLock = false;
            return this.processQueue();
        }
    }

    public destroy(): void {
        if(this.voiceConnection != null && this.voiceConnection.state.status != "destroyed") {
            console.log("destroying connection")
            this.voiceConnection.destroy();
        };
    }

    public playDummySound(): void {
        if(this.voiceConnection != null && this.voiceConnection.state.status == "ready"){
            this.enqueue("0");
        }
    }

    public toggleSecretState(): boolean {
        this.secretState = !this.secretState;
        return this.secretState;
    }

    public getSecretState(): boolean {
        return this.secretState;
    }
}