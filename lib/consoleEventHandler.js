/**
 * Console Event Handler - Sends the events to a Console
 *
 * Created by: Julian Jewel
 *
 */

module.exports = exports = function(options) {
    return {
        onInsert: function(req, res) {
            if (_.contains(options.operation, 'i') && _.contains(options.include, req.params.collection)) {
                push(req.params.collection, res.locals.docs, 'i');
            }
        },
        onUpdate: function(req, res) {
            console.log('meow');
            if (_.contains(options.operation, 'u') && _.contains(options.include, req.params.collection)) {
                console.log('pushing');
                push(req.params.collection, res.locals.docs, 'u');
            }
        },
        onDelete: function(req, res) {
            if (_.contains(options.operation, 'd') && _.contains(options.include, req.params.collection)) {
                push(req.params.collection, res.locals.docs, 'd');
            }
        }
    }
}

function push(collectionName, docs, operation) {
    // Push to the list
    if (!_.isUndefined(docs) && !_.isEmpty(docs)) {
        if (_.isArray(docs)) {
            _.each(docs, function(doc, i) {
                pushDoc(collectionName, doc, operation);
            })
        } else {
            pushDoc(collectionName, docs, operation);
        }
    }

}

function pushDoc(collectionName, doc, operation) {
    var json = {};
    json.ts = new Date();
    json.op = operation;
    json.ns = collectionName;
    json.o = doc;
    var jsonString = JSON.stringify(json);
    // console.log("Published to Channel:" + channel + ' Value:' + jsonString);
}