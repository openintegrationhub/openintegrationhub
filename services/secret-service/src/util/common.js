
module.exports = {

    maskString: (string = '') => {

        const regex = string.length < 10 ? /./g : /.(?=.{4,}$)/g;

        return string.replace(regex, '*');
    }

};
