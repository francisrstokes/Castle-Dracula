import { ActorBase } from "../Actor";
import { PriorityQueue } from "./priority-queue";

export class Scheduler {
  private queue: PriorityQueue<ActorBase> = new PriorityQueue({
    comparatorFn: (a, b) => a.delay - b.delay
  });
  private actorList: ActorBase[] = [];

  loadActors(actors: ActorBase[]) {
    for (const actor of actors) {
      actor.delay = 1 / actor.speed;
      this.queue.insert(actor);
      this.actorList.push(actor);
    }
  }

  unload(actor: ActorBase) {
    this.actorList = this.actorList.filter(a => a !== actor);
    this.queue.clear();
    this.loadActors(this.actorList);
  }

  next() {
    const nextActor = this.queue.remove();
    if (!nextActor) {
      throw new Error('No actors queued');
    }

    // Decrement the delays
    this.actorList.forEach(a => {
      if (a !== nextActor) {
        a.delay -= nextActor.delay;
      }
    });

    // Re-insert the selected actor
    nextActor.delay = 1 / nextActor.speed;
    this.queue.insert(nextActor);

    return nextActor;
  }
}
