import {
  BarbellIcon,
  FirstAidKitIcon,
  FlowerLotusIcon,
  PersonSimpleRunIcon,
  SneakerMoveIcon,
  SoccerBallIcon,
} from "@phosphor-icons/react";

/** One icon per department and per fitness goal, shared by every MoveWell surface. */
export const DEPARTMENT_ICONS = {
  sports: SoccerBallIcon,
  footwear: SneakerMoveIcon,
  health: FirstAidKitIcon,
};

export const GOAL_ICONS = {
  running: PersonSimpleRunIcon,
  gym: BarbellIcon,
  yoga: FlowerLotusIcon,
};
