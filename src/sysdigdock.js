import DockerEventsTracker from './docker-events-tracker.js';
import ContainerLogger from './container-logger.js';
import express from 'express';
import fs from 'fs';

startup_check();

const ActiveContainerLoggers = {};

const tracker = new DockerEventsTracker();

tracker.on('start', (event_data) => {
	if (ActiveContainerLoggers[event_data.id]) {
		// We are already logging for this container_id
		console.warn(`Container started but we are already logging for it: ${event_data.id}`);
	} else {
		ActiveContainerLoggers[event_data.id] = new ContainerLogger(event_data.id, event_data.name);
	}
});

tracker.on('die', (event_data) => {
	if (ActiveContainerLoggers[event_data.id]) {
		ActiveContainerLoggers[event_data.id].kill();
		delete ActiveContainerLoggers[event_data.id];
	}
});

// Setup RESTful API
const app = express();

app.get('/', (req, res) => {
	res.send(JSON.stringify(Object.keys(ActiveContainerLoggers).map(key => {
		const mode = ActiveContainerLoggers[key].mode;
		return {
			container: key,
			mode: mode
		}
	}), null, 2));
});

app.get('/:id/:mode', (req, res) => {
	const logger = ActiveContainerLoggers[req.params.id];

	if (!logger) {
		res.sendStatus(404);
		return;
	}

	try {
		logger.setMode(req.params.mode);
		res.sendStatus(200);
	} catch {
		res.sendStatus(500);
	}
});

app.listen(1337, () => {
	console.log(`Server running at http://localhost:1337`);
});

function startup_check() {
	// sudo check
	if (process.getuid() !== 0) {
		console.error('Needs root permissions (start using sudo)');
		process.exit(1);
	}

	if(!fs.existsSync('./logs')) {
		console.log('Creating ./logs directory');
		fs.mkdirSync('./logs');
	}
}