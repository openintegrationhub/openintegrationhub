export function getMessage(error) {
    if (error.response) {
        if (error.response.data && error.response.data.message) {
            return error.response.data.message;
        }
    }
    return 'An error has occurred';
}
