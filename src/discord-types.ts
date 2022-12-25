import { Awaitable, ButtonInteraction, CacheType, Message, ModalSubmitInteraction, TextBasedChannel } from 'discord.js';
import { interpret } from 'xstate';
import { wheelMachine } from './fsm.js';

// FIXME: dumb type hack
const hackWheelService = interpret(wheelMachine);
interface WheelGame {
  channel: TextBasedChannel;
  service: typeof hackWheelService;
  currentMessage: Message | null,
}

interface StateHandler {
  onTransition?: (state: typeof hackWheelService.initialState, game: WheelGame) => void;
  buttonHandler?: (interaction: ButtonInteraction<CacheType>, game: WheelGame) => Awaitable<void>;
  modalHandler?: (interaction: ModalSubmitInteraction<CacheType>, game: WheelGame) => Awaitable<void>;
}

enum Interactions {
  JoinGame = 'join-game',
  StartGame = 'start-game',
  SpinWheel = 'spin-wheel',
  BuyVowel = 'buy-vowel',
  SolvePuzzle = 'solve-puzzle',
}

export { WheelGame, StateHandler, Interactions };
