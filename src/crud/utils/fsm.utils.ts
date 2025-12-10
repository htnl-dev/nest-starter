import { createMachine, createActor } from 'xstate';
import { InvalidTransitionException } from '../errors/fsm.errors';

export interface FsmConfig<TStatus extends string> {
  id: string;
  initial: TStatus;
  states: {
    [K in TStatus]: {
      on?: { [event: string]: TStatus };
      type?: 'final';
    };
  };
}

export interface FsmTransitionResult<TStatus extends string> {
  from: TStatus;
  to: TStatus;
  event: string;
  isValid: boolean;
}

/**
 * Create a finite state machine from a configuration
 */
export function createFsm<TStatus extends string>(config: FsmConfig<TStatus>) {
  const machine = createMachine({
    id: config.id,
    initial: config.initial,
    states: config.states as Record<string, object>,
  });

  function canTransition(from: TStatus, event: string): boolean {
    const actor = createActor(machine, {
      snapshot: machine.resolveState({ value: from }),
    });
    return actor.getSnapshot().can({ type: event });
  }

  function getNextState(from: TStatus, event: string): TStatus | null {
    const actor = createActor(machine, {
      snapshot: machine.resolveState({ value: from }),
    });
    actor.start();

    if (!actor.getSnapshot().can({ type: event })) {
      actor.stop();
      return null;
    }

    actor.send({ type: event });
    const nextState = actor.getSnapshot().value as TStatus;
    actor.stop();
    return nextState;
  }

  function transition(from: TStatus, event: string): FsmTransitionResult<TStatus> {
    const nextState = getNextState(from, event);

    if (!nextState) {
      throw new InvalidTransitionException(from, event);
    }

    return { from, to: nextState, event, isValid: true };
  }

  function getAvailableEvents(from: TStatus): string[] {
    const stateConfig = config.states[from];
    return stateConfig?.on ? Object.keys(stateConfig.on) : [];
  }

  function isFinalState(state: TStatus): boolean {
    return config.states[state]?.type === 'final';
  }

  return {
    machine,
    canTransition,
    getNextState,
    transition,
    getAvailableEvents,
    isFinalState,
  };
}

/**
 * Simple transition validator without xstate (for lightweight use cases)
 */
export function createSimpleTransitionTable<TStatus extends string>(
  transitions: Record<TStatus, TStatus[]>,
) {
  function canTransition(from: TStatus, to: TStatus): boolean {
    return transitions[from]?.includes(to) ?? false;
  }

  function validate(from: TStatus, to: TStatus): void {
    if (!canTransition(from, to)) {
      throw new InvalidTransitionException(from, to);
    }
  }

  function getNextStates(from: TStatus): TStatus[] {
    return transitions[from] ?? [];
  }

  return { canTransition, validate, getNextStates };
}
