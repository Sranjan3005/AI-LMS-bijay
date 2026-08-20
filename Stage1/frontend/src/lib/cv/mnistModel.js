/**
 * mnistModel.js — loads the pre-trained MNIST network once and shares it.
 *
 * The weights (public/models/mnist/mlp.json) are a 784→128→10 MLP trained on
 * real MNIST. Two modules need them and would otherwise import each other:
 *   • digit.js       runs the whole network for a straight prediction
 *   • digitTrainer.js uses only the frozen 784→128 half as a feature extractor
 * Keeping the loader here means neither has to depend on the other.
 */

let _model = null;
let _loading = null;

export async function loadDigitModel() {
  if (_model) return _model;
  if (!_loading) {
    const url = (import.meta.env.BASE_URL || '/') + 'models/mnist/mlp.json';
    _loading = fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error('digit model failed to load');
        return r.json();
      })
      .then((m) => { _model = m; return m; });
  }
  return _loading;
}
