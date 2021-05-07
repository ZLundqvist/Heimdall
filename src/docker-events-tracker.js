import Docker from 'dockerode';
import EventEmitter from 'events';

class DockerEventsTracker extends EventEmitter {
	constructor() {
		super();
		this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
		this.init();
	}

	async init() {
		const events = await this.docker.getEvents({
			filters: {
				type: ['container']
			}
		});

		events.on('data', (data) => {
			this.on_event_data(JSON.parse(data.toString()));
		});

		console.log('Attached to docker events');
	}

	on_event_data(data) {
		const id = data.id.substring(0, 12);

		if (data.Action === 'start') {
			this.emit('start', {
				id: id,
				name: data.Actor.Attributes.name
			});
		} else if (data.Action === 'die') {
			this.emit('die', { id: id });
		}
	}
}

export default DockerEventsTracker;
