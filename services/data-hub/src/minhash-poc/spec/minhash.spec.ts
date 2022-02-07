/* eslint-disable @typescript-eslint/explicit-function-return-type */

import chai from "chai"
import Minhash from "../lib/Minhash"
const should = chai.should()
const assert = chai.assert

describe("minhash", function () {
    const m1 = new Minhash()
    describe("hashValues", function () {
        it("should all be less than max hash", function () {
            m1.hashValues.forEach(function (v) {
                (v <= m1.maxHash).should.equal(true)
            })
        })

        it("should update", function () {
            const _m1 = JSON.parse(JSON.stringify(m1))
            let updated = false
            m1.update("cats")
            m1.hashValues.forEach(function (v, i) {
                if (_m1.hashValues[i] !== m1.hashValues[i]) updated = true
            })
            updated.should.equal(true)
        })

        it("should have len() === minhash.numPerm", function () {
            const m2 = new Minhash({ numPerm: 256, seed: 1 })
      ;(m2.hashValues.length === m2.numPerm).should.equal(true)
        })
    })

    describe("permutations", function () {
        it("aPerm.length should equal bPerm.length", function () {
            (m1.permA.length === m1.permB.length).should.equal(true)
        })

        it("should be larger than 0 and less than maxHash", function () {
            m1.permA.forEach(function (p) {
                const inRange = p >= 0 && p <= m1.maxHash
                inRange.should.equal(true)
            })
        })

        it("should not contain duplicates", function () {
            const seen = {}
            let vals = 0
            const perms = [m1.permA, m1.permB]
            for (let i = 0; i < perms.length; i++) {
                for (let j = 0; j < perms[i].length; j++) {
                    seen[perms[i][j]] = true
                    vals++
                }
            }
            (Object.keys(seen).length === vals).should.equal(true)
        })
    })

    describe("jaccard", function () {
        it("should error when minhash seeds differ", function () {
            const m1 = new Minhash({ numPerm: 128, seed: 2 })
            const m2 = new Minhash({ numPerm: 128, seed: 3 })
            try {
                m1.jaccard(m2)
            } catch (err) {
                // @ts-ignore: TS2532
                err.should.be.an("error")
            }
        })

        it("should error when hashvalue length differ", function () {
            const m1 = new Minhash({ numPerm: 128, seed: 1 })
            const m2 = new Minhash({ numPerm: 256, seed: 1 })
            try {
                m1.jaccard(m2)
            } catch (err) {
                // @ts-ignore: TS2532
                err.should.be.an("error")
            }
        })
    })

    describe("randint", function () {
        it("should return values >=0 and <= maxHash", function () {
            const m1 = new Minhash()
            for (let i = 0; i < 1000; i++) {
                const num = m1.randInt()
        ;(num >= 0 && num <= m1.maxHash).should.equal(true)
            }
        })
    })
})
