const ccxt = require ('ccxt');

/**
 * Override CCXT OKX functions.
 */
class okxApi extends ccxt.okex5 {
  /**
   * This function calls ccxt.fetchBalance()
   * @param {ccxt.Params} params 
   */
  async fetchEquity(params = undefined) {
    try {
      let resData = await super.fetchBalance(params);
      return resData.info;
    } catch (errorMsg) {
      let errorJSON = JSON.parse(String(errorMsg).split(' okex5 ')[1]);
      // console.log(errorJSON);
      return errorJSON;
    }
  }
}
exports.okxApi = okxApi;