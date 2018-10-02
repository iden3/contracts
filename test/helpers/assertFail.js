/* global assert */

module.exports = async (callback, reason) => {
    try {
        await callback;
    } catch (error) {
        if (error.message.search("VM Exception while processing transaction") === -1) {
            throw error;
        }
        if (typeof reason !== 'undefined' && error.message.search("Reason given: "+reason+".") === -1) {
            throw error;
        }
        return;
    }
    assert(false, "Transaction should fail");
};
