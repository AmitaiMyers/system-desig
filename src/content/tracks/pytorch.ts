import { box, edge, lesson, q, state, store, type Lesson } from '../lesson';

const SOURCE = 'PyTorch documentation and tutorials (pytorch.org/docs)';

export const PYTORCH_LESSONS: Lesson[] = [
  lesson({
    id: 'torch-tensors',
    title: 'Tensors, shapes and devices',
    summary: 'The n-dimensional array everything else is built on — and the two errors it causes most.',
    paragraphs: [
      'A tensor is a multi-dimensional array with a shape, a data type (dtype) and a device. A batch of 32 colour images of 224×224 pixels has shape (32, 3, 224, 224). Most bugs in model code are shape bugs, so print shapes early and often.',
      'Operations between tensors of different shapes use broadcasting: dimensions are aligned from the right, and a dimension of size 1 is stretched to match. It is convenient, and it can silently produce a result of the wrong shape instead of an error.',
      'A tensor lives on one device — CPU or a specific GPU. Operands must be on the same device, and moving data between them (.to(device)) is a copy that takes time. Create tensors on the device where they will be used, and move a model and its inputs together.',
    ],
    states: [
      state('A batch', 'Shape (32, 3, 224, 224): batch, channels, height, width. dtype float32, on the GPU.', [box('t', 'Tensor', 0, 0, { sub: 'shape (32, 3, 224, 224)', span: 2, tone: 'good' }), box('d', 'cuda:0', 2, 0, { sub: 'float32', tone: 'info' })], []),
      state('Broadcasting', 'Shapes (32, 10) and (10,) align from the right; the second is stretched across the batch.', [box('a', 'Logits (32, 10)', 0, 0), box('b', 'Bias (10,)', 2, 0, { sub: 'stretched to (32, 10)', tone: 'info' }), box('r', 'Result (32, 10)', 1, 1, { tone: 'good' })], [edge('a', 'r'), edge('b', 'r')]),
      state('Device mismatch', 'Model on the GPU, input still on the CPU: a runtime error. Move both to the same device.', [box('m', 'Model', 0, 0, { sub: 'cuda:0', tone: 'good' }), box('x', 'Input', 2, 0, { sub: 'cpu', tone: 'bad' }), box('e', 'RuntimeError', 1, 1, { sub: 'expected same device', tone: 'bad' })], [edge('m', 'e', { tone: 'bad' }), edge('x', 'e', { tone: 'bad' })]),
    ],
    card: {
      points: ['A tensor has a shape, a dtype and a device.', 'Broadcasting aligns shapes from the right and stretches size-1 dimensions.', 'Operands must share a device; .to(device) copies.'],
      insight: 'When something is wrong, check shapes, dtypes and devices before anything else. A broadcast that should not have happened is the hardest bug to see.',
      source: SOURCE,
    },
    quiz: [
      q('What is the shape of a batch of 16 RGB images, 64×64 pixels, in PyTorch’s default layout?', ['(16, 64, 64, 3)', '(16, 3, 64, 64)', '(3, 16, 64, 64)', '(64, 64, 3, 16)'], 1, 'Batch, channels, height, width.'),
      q('Adding tensors of shape (32, 10) and (10,) gives…', ['An error', 'Shape (32, 10) by broadcasting', 'Shape (10,)', 'Shape (320,)'], 1, 'The (10,) tensor is treated as (1, 10) and stretched over the batch dimension.'),
    ],
  }),
  lesson({
    id: 'torch-autograd',
    title: 'Autograd: how gradients are computed',
    summary: 'PyTorch records the operations of the forward pass and replays them backwards.',
    paragraphs: [
      'Training needs the gradient of the loss with respect to every parameter. PyTorch gets it by recording: for tensors with requires_grad=True, every operation in the forward pass adds a node to a computation graph that remembers how to differentiate that operation.',
      'Calling loss.backward() walks this graph in reverse, applying the chain rule, and stores the result in each parameter’s .grad. The graph is rebuilt on every forward pass, which is why ordinary Python control flow — loops, ifs — just works in models.',
      'Gradients accumulate: backward adds to .grad rather than replacing it, so you must clear them each step. And recording costs memory, so wrap evaluation and inference in torch.no_grad() to switch it off.',
    ],
    states: [
      state('Forward', 'Each operation produces a result and records how it was made.', [box('x', 'Input x', 0, 0), box('w', 'Weight w', 0, 1, { sub: 'requires_grad', tone: 'info' }), box('y', 'y = w · x', 1, 0), box('l', 'loss', 2, 0, { tone: 'good' })], [edge('x', 'y'), edge('w', 'y'), edge('y', 'l')]),
      state('Backward', 'loss.backward() follows the recorded graph in reverse and fills w.grad with ∂loss/∂w.', [box('x', 'Input x', 0, 0), box('w', 'Weight w', 0, 1, { sub: 'w.grad is filled', tone: 'good' }), box('y', 'y = w · x', 1, 0), box('l', 'loss', 2, 0, { tone: 'info' })], [edge('l', 'y', { label: 'chain rule', tone: 'info' }), edge('y', 'w', { tone: 'info' })]),
      state('no_grad', 'Inside torch.no_grad() nothing is recorded: less memory and faster, for evaluation and inference.', [box('x', 'Input x', 0, 0), box('y', 'Prediction', 2, 0, { sub: 'no graph kept', tone: 'good' })], [edge('x', 'y')]),
    ],
    card: {
      points: ['Forward pass builds a graph of operations for tensors that require gradients.', 'loss.backward() applies the chain rule backwards and fills .grad.', 'Gradients accumulate — zero them each step; use torch.no_grad() for inference.'],
      insight: 'The graph is dynamic and rebuilt per call. That is what makes PyTorch easy to debug with ordinary Python tools — and why forgetting zero_grad silently corrupts training.',
      source: SOURCE,
    },
    quiz: [
      q('What does loss.backward() do?', ['Updates the weights', 'Computes gradients and stores them in each parameter’s .grad', 'Resets the model', 'Runs the forward pass again'], 1, 'Updating the weights is the optimizer’s job (optimizer.step()).'),
      q('Why call optimizer.zero_grad() every iteration?', ['To free GPU memory', 'Because gradients accumulate across backward calls', 'To reset the learning rate', 'It is optional'], 1, 'Otherwise each step would use the sum of all previous gradients.'),
    ],
  }),
  lesson({
    id: 'torch-training-loop',
    title: 'nn.Module and the training loop',
    summary: 'Five lines repeated millions of times: forward, loss, zero, backward, step.',
    paragraphs: [
      'A model is an nn.Module: a class that creates its layers in __init__ and defines the computation in forward. Layers assigned as attributes are registered automatically, so model.parameters() finds every weight and model.to(device) moves them all.',
      'One training step is always the same. Run the batch through the model. Compute the loss against the targets. Clear old gradients. Call backward to compute new ones. Call the optimizer’s step to update the weights.',
      'Two modes matter. model.train() enables training behaviour such as dropout and batch-norm statistics updates; model.eval() switches them to inference behaviour. Forgetting eval() during validation gives noisy, pessimistic metrics; forgetting to switch back to train() quietly harms training.',
    ],
    states: [
      state('1 Forward', 'pred = model(x): the batch flows through the layers.', [box('x', 'Batch x', 0, 0), box('m', 'model(x)', 1, 0, { tone: 'info' }), box('p', 'Predictions', 2, 0, { tone: 'good' })], [edge('x', 'm'), edge('m', 'p')]),
      state('2 Loss', 'loss = loss_fn(pred, y): one number saying how wrong the predictions are.', [box('p', 'Predictions', 0, 0), box('y', 'Targets y', 0, 1), box('l', 'loss_fn', 1, 0, { tone: 'info' }), box('v', 'loss = 0.83', 2, 0, { tone: 'warn' })], [edge('p', 'l'), edge('y', 'l'), edge('l', 'v')]),
      state('3 Backward', 'optimizer.zero_grad(); loss.backward(): gradients for every parameter.', [box('v', 'loss', 2, 0), box('m', 'Parameters', 0, 0, { sub: '.grad filled', span: 2, tone: 'info' })], [edge('v', 'm', { label: 'backward', tone: 'info' })]),
      state('4 Step', 'optimizer.step(): each weight moves a little against its gradient. Repeat with the next batch.', [box('o', 'Optimizer', 0, 0, { sub: 'w ← w − lr · grad', tone: 'info' }), box('m', 'Parameters', 1, 0, { sub: 'updated', span: 2, tone: 'good' })], [edge('o', 'm', { tone: 'good' })]),
    ],
    card: {
      points: ['nn.Module: layers in __init__, computation in forward; parameters are registered automatically.', 'Step: pred = model(x) → loss → zero_grad() → backward() → step().', 'model.train() vs model.eval() changes dropout and batch-norm behaviour.'],
      insight: 'When training misbehaves, first overfit a single batch. If the loss cannot reach near zero on ten examples, the bug is in the loop or the model, not in the data or hyperparameters.',
      source: SOURCE,
    },
    quiz: [
      q('What is the correct order inside one training step?', ['step → backward → forward', 'forward → loss → zero_grad → backward → step', 'backward → forward → step', 'zero_grad → step → forward'], 1, 'Gradients must be computed from the current forward pass before the optimizer uses them.'),
      q('What does model.eval() change?', ['It stops gradient recording', 'It switches layers such as dropout and batch norm to inference behaviour', 'It moves the model to the CPU', 'It saves the model'], 1, 'Stopping gradient recording is torch.no_grad(); the two are usually used together.'),
    ],
  }),
  lesson({
    id: 'torch-data',
    title: 'Datasets and DataLoaders',
    summary: 'Feeding the GPU fast enough is its own engineering problem.',
    paragraphs: [
      'A Dataset answers two questions: how many samples are there (__len__) and what is sample i (__getitem__). A DataLoader wraps it and produces batches: it shuffles the order each epoch, groups samples into tensors, and can load them in parallel.',
      'Loading and preprocessing usually run on the CPU. If they are slower than the model, the GPU sits idle waiting for data. Setting num_workers starts worker processes that prepare batches in the background, and pin_memory speeds up the copy to the GPU.',
      'Shuffle the training set so batches are not correlated; do not shuffle validation. Keep training, validation and test data strictly separate — computing normalisation statistics on the full dataset, for example, leaks test information into training.',
    ],
    states: [
      state('Pipeline', 'Workers load and transform samples in parallel; the loader collates them into batches for the GPU.', [store('d', 'Dataset', 0, 0, { sub: 'sample i' }), box('w', 'Workers ×4', 1, 0, { sub: 'load + augment', tone: 'info' }), box('b', 'Batch', 2, 0, { sub: '(32, 3, 224, 224)', tone: 'good' }), box('g', 'GPU', 2, 1, { sub: 'training step' })], [edge('d', 'w'), edge('w', 'b'), edge('b', 'g')]),
      state('Starved GPU', 'With no workers, loading happens in the main process. The GPU waits most of the time.', [store('d', 'Dataset', 0, 0), box('w', 'Main process', 1, 0, { sub: 'slow loading', tone: 'bad' }), box('g', 'GPU', 2, 0, { sub: '20% utilised', tone: 'warn' })], [edge('d', 'w'), edge('w', 'g', { tone: 'bad' })]),
    ],
    card: {
      points: ['Dataset: __len__ and __getitem__. DataLoader: batching, shuffling, parallel loading.', 'num_workers and pin_memory keep the GPU fed.', 'Shuffle training only; never let validation or test data influence training.'],
      insight: 'Low GPU utilisation almost always means the input pipeline is the bottleneck. Measure data-loading time before buying a bigger GPU.',
      source: SOURCE,
    },
    quiz: [
      q('GPU utilisation is 20% during training. Most likely cause?', ['The model is too large', 'Data loading is the bottleneck', 'The learning rate is too low', 'Too many epochs'], 1, 'Raise num_workers, move preprocessing off the hot path, or cache preprocessed data.'),
      q('Which split should be shuffled every epoch?', ['Training', 'Validation', 'Test', 'All of them'], 0, 'Shuffling decorrelates training batches; evaluation order does not matter.'),
    ],
  }),
  lesson({
    id: 'torch-performance',
    title: 'Speed, saving and deployment',
    summary: 'Mixed precision, compilation, checkpoints and exporting a model out of Python.',
    paragraphs: [
      'Mixed precision runs most operations in 16-bit floats instead of 32-bit: torch.autocast picks the precision per operation and a gradient scaler prevents small gradients from vanishing. On modern GPUs it roughly halves memory use and speeds up training with little or no loss in accuracy. torch.compile, available since PyTorch 2, traces the model and generates optimised code for further speed.',
      'Save model.state_dict() — the tensors of weights — rather than pickling the whole model object, which breaks when the code changes. A training checkpoint should also contain the optimizer state and the epoch so that training can resume exactly.',
      'To serve a model outside a Python training script, export it: TorchScript or ONNX produce a self-contained graph that inference runtimes can load. For serving, batch incoming requests together, use eval mode and no_grad, and measure latency at the percentile you care about.',
    ],
    states: [
      state('Mixed precision', 'autocast runs the forward pass in float16 where safe: about half the memory and a faster step.', [box('a', 'float32', 0, 0, { sub: '12 GB · 1.0×', tone: 'warn' }), box('b', 'autocast (float16)', 1, 0, { sub: '~6 GB · faster', span: 2, tone: 'good' })], [edge('a', 'b')]),
      state('Checkpoint', 'Weights, optimizer state and epoch together let training resume exactly where it stopped.', [box('m', 'model.state_dict()', 0, 0), box('o', 'optimizer state', 1, 0), box('e', 'epoch, step', 2, 0), store('f', 'checkpoint.pt', 1, 1, { tone: 'good' })], [edge('m', 'f'), edge('o', 'f'), edge('e', 'f')]),
      state('Export', 'An exported graph runs in a serving runtime with no dependency on your training code.', [box('m', 'Trained model', 0, 0), box('x', 'TorchScript / ONNX', 1, 0, { sub: 'self-contained graph', tone: 'info' }), box('s', 'Inference server', 2, 0, { sub: 'batched requests', tone: 'good' })], [edge('m', 'x'), edge('x', 's')]),
    ],
    card: {
      points: ['torch.autocast + gradient scaling: mixed precision for less memory and more speed.', 'torch.compile optimises the model’s code (PyTorch 2+).', 'Save state_dict plus optimizer state; export with TorchScript or ONNX for serving.'],
      insight: 'Training speed is usually won in this order: fix the data pipeline, enable mixed precision, then compile. Reach for a bigger machine last.',
      source: SOURCE,
    },
    quiz: [
      q('What should you save to resume training exactly?', ['Only the final loss', 'Model state_dict, optimizer state and the current epoch', 'The whole Python process', 'Just the dataset'], 1, 'Optimizers such as Adam keep per-parameter state that matters for resuming.'),
      q('What does mixed precision mainly give you?', ['Higher accuracy', 'Lower memory use and faster training on GPUs', 'Smaller datasets', 'Automatic hyperparameter tuning'], 1, 'Most operations run in 16-bit floats, with scaling to keep gradients stable.'),
    ],
  }),
];
