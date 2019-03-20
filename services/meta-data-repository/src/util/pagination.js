const url = require('url');
const qs = require('qs');
const conf = require('../conf');

module.exports = class Pagination {
    constructor(url_, dao) {
        const page_ = (qs.parse(url.parse(url_).query)).page;
        this.dao = dao;
        this.perPage = (page_ && page_.size && parseInt(page_.size, 10))
        || conf.pagination.pageSize;
        this.page = (page_ && page_.number && parseInt(page_.number, 10))
        || conf.pagination.defaultPage;
    }

    async calc(query) {
        const total = await this.dao.countBy(query);
        const totalPages = Math.ceil(total / this.perPage) > 1
            ? Math.ceil(total / this.perPage) : 1;
        return {
            page: this.page,
            perPage: this.perPage,
            total,
            totalPages,
        };
    }

    props() {
        return {
            skip: (this.page - 1) * this.perPage,
            limit: this.perPage,
        };
    }
};
