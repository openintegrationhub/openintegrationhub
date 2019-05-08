const url = require('url');
const qs = require('qs');
const conf = require('../conf');

module.exports = class Pagination {
    constructor(url_, dao, entity) {
        const page_ = (qs.parse(url.parse(url_).query)).page;
        this.dao = dao;
        this.entity = entity;
        this.perPage = (page_ && page_.size && parseInt(page_.size, 10))
        || conf.pagination.pageSize;
        this.page = (page_ && page_.number && parseInt(page_.number, 10))
        || conf.pagination.defaultPage;
    }

    async calc() {
        this.total = await this.dao.countByEntity(this.entity);
        this.totalPages = Math.ceil(this.total / this.perPage) > 1
            ? Math.ceil(this.total / this.perPage) : 1;
        return {
            page: this.page,
            perPage: this.perPage,
            total: this.total,
            totalPages: this.totalPages,
        };
    }

    props() {
        return {
            skip: (this.page - 1) * this.perPage,
            limit: this.perPage,
        };
    }
};
