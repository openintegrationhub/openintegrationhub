// https://github.com/duhaime/minhash
import Minhash from "./Minhash"

/**
 * Main class for indexing Minhash signatures
 **/

interface Index {
    [name: string]: string[];
}

export interface LshIndexConfig {
    bandSize: number;
}

class LshIndex {
    private bandSize: number
    public index: Index

    public constructor(config: LshIndexConfig = { bandSize: 4 }) {
        this.bandSize = config.bandSize
        this.index = {}
    }

    public insert(key: string, minhash: Minhash): void {
        const hashBands = this.getHashBands(minhash)
        for (let i = 0; i < hashBands.length; i++) {
            const band = hashBands[i]
            if (Array.isArray(this.index[band])) {
                this.index[band].push(key)
            } else {
                this.index[band] = [key]
            }
        }
    }

    public query(minhash: Minhash): string[] {
        const matches = {}
        const hashBands = this.getHashBands(minhash)
        for (let i = 0; i < hashBands.length; i++) {
            const band = hashBands[i]
            for (let j = 0; j < this.index[band].length; j++) {
                matches[this.index[band][j]] = true
            }
        }
        return Object.keys(matches)
    }

    public getHashBands(minhash: Minhash): string[] {
        if (minhash.hashBands && minhash.hashBands.length !== 0) return minhash.hashBands
        minhash.hashBands = []
        for (let i = 0; i < minhash.hashValues.length / this.bandSize; i++) {
            const start = i * this.bandSize
            const end = start + this.bandSize
            const band = minhash.hashValues.slice(start, end)
            minhash.hashBands.push(band.join("."))
        }
        return minhash.hashBands
    }
}

export default LshIndex
