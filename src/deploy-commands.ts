const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { clientId, guildId, token } = require('../config.json');

const commands = [
	new SlashCommandBuilder().setName('activate').setDescription('Activate the Lilian Garcia Bot'),
	new SlashCommandBuilder().setName('deactivate').setDescription('Deactivate the Lilian Garcia Bot'),
	new SlashCommandBuilder().setName('secret').setDescription('Toggle secret mode')
]
	.map(command => command.toJSON());

const rest = new REST({ version: '9' }).setToken(token);

// rest.get(Routes.applicationCommands(clientId))
//     .then((data : any) => {
//         const promises = [];
//         for (const command of data) {
//             const deleteUrl = `${Routes.applicationCommands(clientId)}/${command.id}`;
//             promises.push(rest.delete(deleteUrl));
//         }
//         return Promise.all(promises);
//     });

rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands })
	.then(() => console.log('Successfully registered application commands.'))
	.catch(console.error);