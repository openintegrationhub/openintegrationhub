// https://github.com/duhaime/minhash

/**
 * Minhash class - generates minhash signatures for set
 **/

export interface MinhashConfig {
    numPerm: number;
    seed: number;
}

class Minhash {
    private readonly prime: number = 4294967311
    public readonly maxHash: number = Math.pow(2, 32) - 1
    public hashValues: number[]
    public hashBands: string[]
    public permA: number[]
    public permB: number[]
    public numPerm: number
    private seed: number

    public constructor(config: MinhashConfig = { numPerm: 128, seed: 1 }) {
    // initialize the minhash
        this.numPerm = config.numPerm
        this.seed = config.seed
        this.hashValues = []
        this.hashBands = []
        this.permA = []
        this.permB = []

        // share permutation functions across all minhashes
        this.initHashValues()
        this.initPermutations()
    }

    // initialize the hash values as the maximum value
    private initHashValues(): void {
        for (let i = 0; i < this.numPerm; i++) {
            this.hashValues.push(this.maxHash)
        }
    }

    // initialize the permutation functions for a & b
    // don't reuse any integers when making the functions
    private initPermutations(): void {
        const used = {}
        for (let i = 0; i < 2; i++) {
            const perms: number[] = []
            for (let j = 0; j < this.numPerm; j++) {
                let int = this.randInt()
                while (used[int]) int = this.randInt()
                perms.push(int)
                used[int] = true
            }
            const key = ["permA", "permB"][i]
            this[key] = perms
        }
    }

    // return a random integer >= 0 and <= maxHash
    public randInt(): number {
        const x = Math.sin(this.seed++) * this.maxHash
        return Math.floor((x - Math.floor(x)) * this.maxHash)
    }

    // hash a string to a 32 bit unsigned int
    private hash(str: string): number {
        let hash = 0
        if (str.length === 0) {
            return hash + this.maxHash
        }
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i)

            hash = (hash << 5) - hash + char
            hash = hash & hash // convert to a 32bit integer
        }
        return hash + this.maxHash
    }

    // the update function updates internal hashvalues given user data
    public update(str: string): void {
        for (let i = 0; i < this.hashValues.length; i++) {
            const a = this.permA[i]
            const b = this.permB[i]
            const hash = (a * this.hash(str) + b) % this.prime
            if (hash < this.hashValues[i]) {
                this.hashValues[i] = hash
            }
        }
    }

    // estimate the jaccard similarity to another minhash
    public jaccard(other: Minhash): number {
        if (this.hashValues.length != other.hashValues.length) {
            throw new Error("hashvalue counts differ")
        } else if (this.seed != other.seed) {
            throw new Error("seed values differ")
        }
        let shared = 0
        for (let i = 0; i < this.hashValues.length; i++) {
            shared += this.hashValues[i] === other.hashValues[i] ? 1 : 0
        }
        return shared / this.hashValues.length
    }
}

export default Minhash
