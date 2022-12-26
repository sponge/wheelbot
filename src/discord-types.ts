import { Awaitable, ButtonInteraction, CacheType, CommandInteraction, Message, ModalSubmitInteraction, SelectMenuInteraction, TextBasedChannel } from 'discord.js';
import { interpret } from 'xstate';
import { createWheelMachine } from './fsm.js';

// FIXME: dumb type hack
const hackWheelService = interpret(createWheelMachine());
interface WheelGame {
  channel: TextBasedChannel;
  service: typeof hackWheelService;
  currentMessage: Message | null,
  lastGuess: string,
}

interface StateHandler {
  onTransition?: (state: typeof hackWheelService.initialState, game: WheelGame) => void;
  buttonHandler?: (interaction: ButtonInteraction<CacheType>, game: WheelGame) => Awaitable<void>;
  modalHandler?: (interaction: ModalSubmitInteraction<CacheType>, game: WheelGame) => Awaitable<void>;
  selectHandler?: (interaction: SelectMenuInteraction<CacheType>, game: WheelGame) => Awaitable<void>;
  commandHandler?: (interaction: CommandInteraction<CacheType>, game: WheelGame) => boolean;
}

enum Interactions {
  JoinGame = 'join-game',
  StartGame = 'start-game',
  SpinWheel = 'spin-wheel',
  BuyVowel = 'buy-vowel',
  SolvePuzzle = 'solve-puzzle',
}

export { WheelGame, StateHandler, Interactions };
