/* eslint-disable @typescript-eslint/explicit-function-return-type */

import chai from "chai"
import Minhash from "../lib/Minhash"
import LshIndex from "../lib/LshIndex"

const should = chai.should()
const assert = chai.assert

describe("LshIndex", function () {
    const index = new LshIndex()
    const m1 = new Minhash()
    describe("insertions", function () {
        it("should accept new insertions", function () {
            const _index = JSON.parse(JSON.stringify(index))
            index.insert("m1", m1)
            ;(Object.keys(index) === Object.keys(_index)).should.equal(false)
        })
    })

    describe("queries", function () {
        it("should return matches", function () {
            const m1 = new Minhash()
            const m2 = new Minhash()
            const index = new LshIndex()
            m1.update("hello")
            m2.update("hello")
            index.insert("m1", m1)
            index.insert("m2", m2)
            const results = index.query(m1)
      ;(results.indexOf("m2") > -1).should.equal(true)
        })
    })

    describe("hashbands", function () {
        it("should cache hashbands", function () {
            const m1 = new Minhash()
            const index = new LshIndex()
            index.insert("m1", m1)
            ;(m1.hashBands.length > 0).should.equal(true)
        })

        it("should allow users to set hashband length", function () {
            const m1 = new Minhash()
            const index = new LshIndex({ bandSize: 3 })
            index.insert("m1", m1)
            ;(m1.hashBands[0].split(".").length === 3).should.equal(true)
        })
    })
})
