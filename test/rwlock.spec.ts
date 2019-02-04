import { expect } from './helpers';

import { ErrNotLocked, ErrTimeout, RWLock, State } from '../src/rwlock';

it('throws error when unlocking an unlocked RWLock', function() {
    const lock = new RWLock();
    expect(() => lock.unlock()).to.throw(ErrNotLocked);
});

describe('read lock tests', function() {
    it('single reader', async function() {
        const lock = new RWLock();
        await lock.readLock();
        expect(lock.getState()).to.equal(State.Reading);
        lock.unlock();
        expect(lock.getState()).to.equal(State.Idle);
    });

    it('multiple readers', function(done) {
        const lock = new RWLock();
        let count = 0;
        lock.readLock().then(function() {
            count++;
            lock.readLock().then(function() {
                count++;
                expect(count).to.equal(2);
                lock.unlock();
                lock.unlock();
                done();
            });
        });
    });
});

describe('write lock tests', function() {
    it('single writer', async function() {
        const lock = new RWLock();
        await lock.writeLock();
        expect(lock.getState()).to.equal(State.Writing);
        lock.unlock();
        expect(lock.getState()).to.equal(State.Idle);
    });

    it('multiple writers', function(done) {
        const lock = new RWLock();
        lock.writeLock().then(function() {
            let released = false;
            lock.writeLock().then(function() {
                expect(released).to.equal(true);
                lock.unlock();
                done();
            });
            setTimeout(function() {
                released = true;
                lock.unlock();
            }, 0);
        });
    });
});

describe('read-write lock tests', function() {
    it('single reader, single writer', function(done) {
        const lock = new RWLock();
        lock.readLock().then(function() {
            let released = false;
            lock.writeLock().then(function() {
                expect(released).to.equal(true);
                lock.unlock();
                done();
            });
            setTimeout(function() {
                released = true;
                lock.unlock();
            }, 0);
        });
    });

    it('single writer, single reader', function(done) {
        const lock = new RWLock();
        lock.writeLock().then(function() {
            let released = false;
            lock.readLock().then(function() {
                expect(released).to.equal(true);
                lock.unlock();
                done();
            });
            setTimeout(function() {
                released = true;
                lock.unlock();
            }, 0);
        });
    });

    it('multiple readers, single writer', function(done) {
        const lock = new RWLock();
        lock.readLock().then(function() {
            let released = 0;
            lock.readLock().then(function() {
                lock.writeLock().then(function() {
                    expect(released).to.equal(2);
                    lock.unlock();
                    done();
                });
                setTimeout(function() {
                    released++;
                    lock.unlock();
                }, 0);
            });
            setTimeout(function() {
                released++;
                lock.unlock();
            }, 0);
        });
    });

    it('multiple readers, multiple writers', function(done) {
        const lock = new RWLock();
        function wrap(callback: () => void) {
            let released = false;

            lock.readLock().then(function() {
                lock.writeLock().then(function() {
                    if (released) {
                        lock.unlock();
                        callback();
                    } else {
                        released = true;
                        setTimeout(function() {
                            lock.unlock();
                        }, 0);
                    }
                });
                setTimeout(function() {
                    lock.unlock();
                }, 0);
            });

            lock.writeLock().then(function() {
                lock.readLock().then(function() {
                    if (released) {
                        lock.unlock();
                        callback();
                    } else {
                        released = true;
                        setTimeout(function() {
                            lock.unlock();
                        }, 0);
                    }
                });
                setTimeout(function() {
                    lock.unlock();
                }, 0);
            });
        }

        let real = Math.random;
        Math.random = () => 0;
        wrap(function() {
            Math.random = () => 1;
            wrap(function() {
                Math.random = real;
                done();
            });
        });
    });
});

describe('timeout tests', function() {
    it('read lock timeout', async function() {
        const lock = new RWLock();
        await lock.writeLock();
        await expect(lock.readLock(1)).to.be.rejectedWith(ErrTimeout);
        lock.unlock();
    });

    it('read lock acquired before timeout', function(done) {
        const lock = new RWLock();
        let released = false;
        lock.writeLock().then(function() {
            lock.readLock(100).then(function() {
                expect(released).to.equal(true);
                lock.unlock();
                done();
            });
            setTimeout(function() {
                released = true;
                lock.unlock();
            }, 0);
        });
    });

    it('write lock timeout', async function() {
        const lock = new RWLock();
        await lock.readLock();
        await expect(lock.writeLock(1)).to.be.rejectedWith(ErrTimeout);
        lock.unlock();
    });

    it('write lock acquired before timeout', function(done) {
        const lock = new RWLock();
        let released = false;
        lock.readLock().then(function() {
            lock.writeLock(100).then(function() {
                expect(released).to.equal(true);
                lock.unlock();
                done();
            });
            setTimeout(function() {
                released = true;
                lock.unlock();
            }, 0);
        });
    });
});
