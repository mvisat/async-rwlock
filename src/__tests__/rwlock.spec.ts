import { ErrNotLocked, ErrTimeout, RWLock, State } from '../rwlock';

it('throws error when unlocking an unlocked RWLock', done => {
    const lock = new RWLock();
    expect(() => lock.unlock()).toThrowError(ErrNotLocked);
    done();
});

describe('read lock tests', () => {
    let lock: RWLock;

    beforeEach(done => {
        lock = new RWLock();
        done();
    });

    test('single reader', async done => {
        await lock.readLock();
        expect(lock.getState()).toBe(State.Reading);
        lock.unlock();
        expect(lock.getState()).toBe(State.Idle);
        done();
    });

    test('multiple readers', done => {
        let count = 0;
        lock.readLock().then(() => {
            count++;
            lock.readLock().then(() => {
                count++;
                expect(count).toBe(2);
                lock.unlock();
                lock.unlock();
                done();
            });
        });
    });
});

describe('write lock tests', () => {
    let lock: RWLock;

    beforeEach(done => {
        lock = new RWLock();
        done();
    });

    test('single writer', async done => {
        await lock.writeLock();
        expect(lock.getState()).toBe(State.Writing);
        lock.unlock();
        expect(lock.getState()).toBe(State.Idle);
        done();
    });

    test('multiple writers', done => {
        lock.writeLock().then(() => {
            let released = false;
            lock.writeLock().then(() => {
                expect(released).toBe(true);
                lock.unlock();
                done();
            });
            setTimeout(() => {
                released = true;
                lock.unlock();
            }, 0);
        });
    });
});

describe('read-write lock tests', () => {
    let lock: RWLock;

    beforeEach(done => {
        lock = new RWLock();
        done();
    });

    test('single reader, single writer', done => {
        lock.readLock().then(() => {
            let released = false;
            lock.writeLock().then(() => {
                expect(released).toBe(true);
                lock.unlock();
                done();
            });
            setTimeout(() => {
                released = true;
                lock.unlock();
            }, 0);
        });
    });

    test('single writer, single reader', done => {
        lock.writeLock().then(() => {
            let released = false;
            lock.readLock().then(() => {
                expect(released).toBe(true);
                lock.unlock();
                done();
            });
            setTimeout(() => {
                released = true;
                lock.unlock();
            }, 0);
        });
    });

    test('multiple readers, single writer', done => {
        lock.readLock().then(() => {
            let released = 0;
            lock.readLock().then(() => {
                lock.writeLock().then(() => {
                    expect(released).toBe(2);
                    lock.unlock();
                    done();
                });
                setTimeout(() => {
                    released++;
                    lock.unlock();
                }, 0);
            });
            setTimeout(() => {
                released++;
                lock.unlock();
            }, 0);
        });
    });

    test('multiple readers, multiple writers', done => {
        function wrap(callback: () => void) {
            let released = false;

            lock.readLock().then(() => {
                lock.writeLock().then(() => {
                    if (released) {
                        lock.unlock();
                        callback();
                    } else {
                        released = true;
                        setTimeout(() => {
                            lock.unlock();
                        }, 0);
                    }
                });
                setTimeout(() => {
                    lock.unlock();
                }, 0);
            });

            lock.writeLock().then(() => {
                lock.readLock().then(() => {
                    if (released) {
                        lock.unlock();
                        callback();
                    } else {
                        released = true;
                        setTimeout(() => {
                            lock.unlock();
                        }, 0);
                    }
                });
                setTimeout(() => {
                    lock.unlock();
                }, 0);
            });
        }

        Math.random = () => 0;
        wrap(() => {
            Math.random = () => 1;
            wrap(done);
        });
    });
});

describe('timeout tests', () => {
    let lock: RWLock;

    beforeEach(done => {
        lock = new RWLock();
        done();
    });

    test('read lock timeout', async done => {
        await lock.writeLock();
        await expect(lock.readLock(1)).rejects.toThrowError(ErrTimeout);
        lock.unlock();
        done();
    });

    test('read lock acquired before timeout', async done => {
        let released = false;
        await lock.writeLock();
        lock.readLock(100).then(() => {
            expect(released).toBe(true);
            lock.unlock();
            done();
        });
        setTimeout(() => {
            released = true;
            lock.unlock();
        }, 0);
    });

    test('write lock timeout', async done => {
        await lock.readLock();
        await expect(lock.writeLock(1)).rejects.toThrowError(ErrTimeout);
        lock.unlock();
        done();
    });

    test('write lock acquired before timeout', async done => {
        let released = false;
        await lock.readLock();
        lock.writeLock(100).then(() => {
            expect(released).toBe(true);
            lock.unlock();
            done();
        });
        setTimeout(() => {
            released = true;
            lock.unlock();
        }, 0);
    });
});
