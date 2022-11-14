const { TOKEN, CLIENT_ID, GUILD_ID, CHANNEL_ID } = require('../config.json');
import { Client, Intents, VoiceChannel, Guild, GuildChannel, NonThreadGuildBasedChannel } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import {
    AudioPlayer,
    AudioPlayerStatus,
    AudioResource,
    createAudioPlayer,
    entersState,
    getVoiceConnection,
    VoiceConnection,
    VoiceConnectionDisconnectReason,
    VoiceConnectionStatus,
    joinVoiceChannel,
    createAudioResource,
    DiscordGatewayAdapterCreator,
    StreamType,
    generateDependencyReport
} from "@discordjs/voice";
import { SoundQueue } from "./voice/SoundQueue";
const fs = require('fs');

console.log(generateDependencyReport());

let soundQueue : SoundQueue;
let bot_state : number = 0;


const client = new Client({
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_VOICE_STATES]
});


client.on("ready", () => {
    // read from config.json to get on/off state and set activity
    const { state } = require('../bot_state.json');

    soundQueue = new SoundQueue();
    
    changeBotState(state);

    setInterval(playDummy, 600000);

    console.log("Bot is ready!");
});

client.on("interactionCreate", async (interaction: any) => {
   if(!interaction.isCommand()){
       return;
   } 

   const { commandName } = interaction;

   if(commandName === "activate"){
       changeBotState(1);
       interaction.reply({
              content: "Activated!"
       });
   }else if(commandName === "deactivate"){
       changeBotState(0);
       interaction.reply({
              content: "Deactivated!"
       });
   }else if(commandName === "secret"){
    const secretS = soundQueue.toggleSecretState();
    setBotActivity(bot_state, secretS);
    const reply = secretS ? "Secret mode activated!" : "Secret mode deactivated!";
    interaction.reply({
           content: reply
    });
}
    
});




client.on("voiceStateUpdate", (oldMember, newMember) => {
    if(bot_state == 0){
        return;
    }
    if (oldMember.channel === null && newMember.channel !== null || oldMember.channel !== null && newMember.channel !== null){
        if(newMember.id == CLIENT_ID) return;
        // User joined a voice channel from nothing

        // Old channel was general
        if (oldMember.channel !== null && oldMember.channel.id == CHANNEL_ID) {
            return;
        }

        // Check if the newMember channel is general or if member is bot
        if (newMember.channel.id == CHANNEL_ID){
            // Check if bot is already in the channel
            if(newMember.channel.members.has(CLIENT_ID)){
                console.log("Bot is in the channel");
                soundQueue.enqueue(newMember.id);
            }else{
                connectAndPlay(newMember.id);
            }
        }
        


    } else if (oldMember.channel !== null) {
        // User left a voice channel from something
        if (oldMember.channel.members.size == 1){
            console.log("Everyone left, leaving general");
            soundQueue.destroy();
        }
    }
});


function connectAndPlay(id: string): void {
    client.guilds.fetch(GUILD_ID).then((guild : Guild) => {
        if(!guild.available){
            return Promise.reject("Guild Not Avaliable");
        }else{
            guild.channels.fetch(CHANNEL_ID).then((channel : any) => {
                if(channel.members.size >= 1){
                    console.log("Attempting to join General");
                    const conn = joinVoiceChannel({
                        channelId: channel.id,
                        guildId: channel.guild.id,
                        selfDeaf: false,
                        selfMute: false,
                        adapterCreator: channel.guild.voiceAdapterCreator as DiscordGatewayAdapterCreator,
                    });
                    soundQueue.setVoiceConnection(conn);
                    soundQueue.enqueue(id);
                }
            });
        } 
    });
}



function changeBotState(state: number): void{
    if(client.user == null){
        return;
    }
    if(bot_state == state){
        return;
    }
    bot_state = state;

    if (state == 1){
        connectAndPlay("0")
    } else {
        soundQueue.destroy();
    }

    setBotActivity(state, soundQueue.getSecretState());

    const obj = {
        "state": state
    }

    var json = JSON.stringify(obj);
    fs.writeFile('./bot_state.json', json, 'utf8', function (err : Error) {
        if(err){
            console.log("Error writing to file");
        }
    });
}

function changeSecretState(secret: boolean): void{
    if(client.user == null){
        return;
    }
    if(secret == soundQueue.getSecretState()){
        return;
    }
    setBotActivity(bot_state, secret);
}


function setBotActivity(state: number, secret: boolean): void{
    let str = state == 1 ? "Currently Active!" : "Currently Inactive";
    str += secret ? " ;)" : "";

    client.user!.setActivity(str, { type: "PLAYING" });
}

function playDummy(): void{
    if(soundQueue != null){
        soundQueue.playDummySound();
    }
}


client.login(TOKEN);