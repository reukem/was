import { useFrame } from '@react-three/fiber';
import { Howler } from 'howler';
import { Vector3, Quaternion } from 'three';

const tempPosition = new Vector3();
const tempQuaternion = new Quaternion();
const tempForward = new Vector3();
const tempUp = new Vector3();

export function AudioListenerSync() {
  useFrame(({ camera }) => {
    camera.getWorldPosition(tempPosition);
    camera.getWorldQuaternion(tempQuaternion);

    // Default forward vector is (0, 0, -1) and up is (0, 1, 0)
    tempForward.set(0, 0, -1).applyQuaternion(tempQuaternion).normalize();
    tempUp.set(0, 1, 0).applyQuaternion(tempQuaternion).normalize();

    // Update Howler listener position
    Howler.pos(tempPosition.x, tempPosition.y, tempPosition.z);

    // Update Howler listener orientation (forward and up vectors)
    Howler.orientation(
      tempForward.x, tempForward.y, tempForward.z,
      tempUp.x, tempUp.y, tempUp.z
    );
  });

  return null; // Invisible component
}
