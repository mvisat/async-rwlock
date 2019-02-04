export enum State {
    Idle,
    Reading,
    Writing,
}

export const ErrNotLocked = new Error('rwlock is already unlocked');
export const ErrTimeout = new Error('acquire lock timeout');

export class RWLock {
    private pendingReaders: any[] = [];
    private pendingWriters: any[] = [];
    private numReaders = 0;
    private state = State.Idle;

    public getState(): State {
        return this.state;
    }

    public async readLock(timeout = Infinity): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (this.state === State.Writing) {
                this.pend(this.pendingReaders, resolve, reject, timeout);
            } else {
                this.numReaders++;
                this.state = State.Reading;
                resolve();
            }
        });
    }

    public async writeLock(timeout = Infinity): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (this.state !== State.Idle) {
                this.pend(this.pendingWriters, resolve, reject, timeout);
            } else {
                this.state = State.Writing;
                resolve();
            }
        });
    }

    public unlock(): void {
        switch (this.state) {
            case State.Reading:
                this.numReaders--;
                if (this.numReaders) {
                    return;
                }

                if (this.pendingWriters.length) {
                    this.allowWrite();
                } else {
                    this.state = State.Idle;
                }
                return;

            case State.Writing:
                const nReaders = this.pendingReaders.length;
                const nWriters = this.pendingWriters.length;

                if (nReaders && nWriters) {
                    // prevent starving by randomly selecting reader/writer
                    Math.random() >= 0.5 ? this.allowRead() : this.allowWrite();
                } else if (nReaders) {
                    this.allowRead();
                } else if (nWriters) {
                    this.allowWrite();
                } else {
                    this.state = State.Idle;
                }
                return;

            default:
                throw ErrNotLocked;
        }
    }

    private pend(
        queue: any[],
        resolve: () => void,
        reject: (reason?: any) => void,
        timeout: number,
    ): void {
        let timer: any = null;
        let rejected = false;

        const doResolve = () => {
            if (rejected) {
                return;
            }
            if (timer) {
                clearTimeout(timer);
            }
            resolve();
        };

        const doReject = () => {
            rejected = true;
            reject(ErrTimeout);
        };

        if (timeout && timeout >= 0 && timeout < Infinity) {
            timer = setTimeout(doReject, timeout);
        }

        queue.push(doResolve);
    }

    private allowWrite(): void {
        const writer = this.pendingWriters.shift();
        this.state = State.Writing;
        writer();
    }

    private allowRead(): void {
        const readers = this.pendingReaders.slice();
        this.numReaders = readers.length;
        this.pendingReaders = [];
        this.state = State.Reading;
        for (const reader of readers) {
            reader();
        }
    }
}
