/**
 * Filter nulls
 * @return {Array} array with no null values.
 */
Array.prototype.filterNulls = function() {
    return this.filter(function(f) {
        return !(f === null || f === undefined);
    });
};

/**
 * Index an array
 * @return {Object} hash of ids.
 */
Array.prototype.indexById = function() {
    var a = {};
    this.forEach(function(item) {
        a[item._id] = item;
    });

    return a;
};