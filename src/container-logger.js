import { spawn } from 'child_process';
import fs from 'fs';
import readline from 'readline';

class ContainerLogger {
    constructor(container_id, container_name) {
        this.container_id = container_id;
        this.container_name = container_name;
        this.log_file = `./logs/${this.container_name}_${container_id}.log`;
        this.mode = 'N';

        this.setup();
        console.log(`Sysdig attached (id=${this.container_id}, output=${this.log_file}, mode=${this.mode})`);
    }

    setup() {
        // Setup write stream to file
        this.writeStream = fs.createWriteStream(this.log_file, {
            flags: 'a',
            mode: 0o666
        });

        // Spawn sysdig
        this.proc = spawn('sysdig', this.getSysdigArgs());
        this.proc.stderr.on('data', (data) => {
            console.log(`Sysdig error (id=${this.container_id}, error=${data})`);
        });

        this.proc.on('close', (code) => {
            console.log(`Sysdig exit (id=${this.container_id}, code=${code})`);
        });

        // Read output from sysdig line by line
        this.rl = readline.createInterface({
            input: this.proc.stdout,
            crlfDelay: Infinity
        });

        this.rl.on('line', (line) => {
            // Check that line contain more than just spaces
            if(line.trim()) {
                this.writeStream.write(`${this.mode} ${line}\n`);
            }
        });
    }

    setMode(mode) {
        switch (mode) {
            case 'A':
                this.mode = 'A';
                break;
            case 'N':
                this.mode = 'N';
                break;
            default:
                throw new Error('Unsupported mode: ' + mode);
        }

        console.log(`Mode set (id=${this.container_id}, mode=${this.mode})`);
    }

    getSysdigArgs() {
        return [
            '-p%evt.rawtime.s.%evt.rawtime.ns %syscall.type', // Sysdig output format (%timestamp %syscallname)
            `container.id=${this.container_id} and syscall.type!=container and evt.dir=">"` // Log only enter events for container=this.container_id
        ];
    }

    kill() {
        this.rl.close();
        this.proc.kill();
        this.writeStream.end();
        console.log(`ContainerLogger killed (id=${this.container_id})`);
    }
}

export default ContainerLogger;
