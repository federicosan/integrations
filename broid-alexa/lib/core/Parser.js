"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const schemas_1 = require("@broid/schemas");
const utils_1 = require("@broid/utils");
const Promise = require("bluebird");
const R = require("ramda");
class Parser {
    constructor(serviceName, serviceID, logLevel) {
        this.serviceID = serviceID;
        this.generatorName = serviceName;
        this.logger = new utils_1.Logger('parser', logLevel);
    }
    validate(event) {
        this.logger.debug('Validation process', { event });
        const parsed = utils_1.cleanNulls(event);
        if (!parsed || R.isEmpty(parsed)) {
            return Promise.resolve(null);
        }
        if (!parsed.type) {
            this.logger.debug('Type not found.', { parsed });
            return Promise.resolve(null);
        }
        return schemas_1.default(parsed, 'activity')
            .then(() => parsed)
            .catch((err) => {
            this.logger.error(err);
            return null;
        });
    }
    parse(event) {
        this.logger.debug('Normalize process');
        const normalized = utils_1.cleanNulls(event);
        if (!normalized || R.isEmpty(normalized)) {
            return Promise.resolve(null);
        }
        const activitystreams = this.createActivityStream();
        activitystreams.actor = {
            id: R.path(['user', 'userId'], normalized),
            name: R.path(['user', 'userId'], normalized),
            type: 'Person',
        };
        activitystreams.target = {
            id: normalized.messageID,
            name: R.path(['application', 'applicationId'], normalized),
            type: 'Application',
        };
        activitystreams.object = {
            content: normalized.intentName,
            id: normalized.messageID,
            type: 'Note',
        };
        if (!R.isEmpty(normalized.slots)) {
            const slots = normalized.slots;
            let context = R.map((key) => {
                const name = R.path([key, 'name'], slots);
                const value = R.path([key, 'value'], slots);
                if (!value) {
                    return null;
                }
                return {
                    content: value,
                    name,
                    type: 'Object',
                };
            }, R.keys(slots));
            context = R.reject(R.isNil)(context);
            if (R.length(context) > 0) {
                activitystreams.object.context = context;
            }
        }
        return Promise.resolve(activitystreams);
    }
    createActivityStream() {
        return {
            '@context': 'https://www.w3.org/ns/activitystreams',
            'generator': {
                id: this.serviceID,
                name: this.generatorName,
                type: 'Service',
            },
            'published': Math.floor(Date.now() / 1000),
            'type': 'Create',
        };
    }
}
exports.Parser = Parser;
