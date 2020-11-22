import APIError from './APIError';

class MissingGlobalLabel extends APIError {
  constructor(config) {
    super(`${config.globals} object is missing label`);
  }
}

export default MissingGlobalLabel;