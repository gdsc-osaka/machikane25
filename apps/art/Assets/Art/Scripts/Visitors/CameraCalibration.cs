using UnityEngine;

namespace Art.Visitors
{
    /// <summary>
    /// Stores calibration parameters that map camera-normalised coordinates into presentation space.
    /// </summary>
    [CreateAssetMenu(menuName = "Art/Visitors/Camera Calibration", fileName = "CameraCalibration")]
    public sealed class CameraCalibration : ScriptableObject
    {
        private const float IdentityTolerance = 0.0001f;

        [SerializeField] private Matrix4x4 homography = Matrix4x4.identity;
        [SerializeField] private Vector2 offset = Vector2.zero;
        [SerializeField] private float scale = 1f;

        public Matrix4x4 Homography => homography;

        public Vector2 Offset => offset;

        public float Scale => scale;

        /// <summary>
        /// Projects a normalised camera-space point into the configured presentation plane.
        /// </summary>
        public Vector2 Transform(Vector2 normalisedPoint)
        {
            var mapped = normalisedPoint;
            if (!IsIdentity(homography))
            {
                mapped = ApplyHomography(normalisedPoint);
            }

            mapped *= scale;
            mapped += offset;
            return mapped;
        }

        private Vector2 ApplyHomography(Vector2 input)
        {
            var x = input.x;
            var y = input.y;

            var denominator = homography.m30 * x + homography.m31 * y + homography.m33;
            if (Mathf.Approximately(denominator, 0f))
            {
                denominator = 1f;
            }

            var projectedX = (homography.m00 * x + homography.m01 * y + homography.m03) / denominator;
            var projectedY = (homography.m10 * x + homography.m11 * y + homography.m13) / denominator;
            return new Vector2(projectedX, projectedY);
        }

        private static bool IsIdentity(Matrix4x4 matrix)
        {
            return Mathf.Abs(matrix.m00 - 1f) < IdentityTolerance
                && Mathf.Abs(matrix.m11 - 1f) < IdentityTolerance
                && Mathf.Abs(matrix.m22 - 1f) < IdentityTolerance
                && Mathf.Abs(matrix.m33 - 1f) < IdentityTolerance
                && Mathf.Abs(matrix.m01) < IdentityTolerance
                && Mathf.Abs(matrix.m02) < IdentityTolerance
                && Mathf.Abs(matrix.m03) < IdentityTolerance
                && Mathf.Abs(matrix.m10) < IdentityTolerance
                && Mathf.Abs(matrix.m12) < IdentityTolerance
                && Mathf.Abs(matrix.m13) < IdentityTolerance
                && Mathf.Abs(matrix.m20) < IdentityTolerance
                && Mathf.Abs(matrix.m21) < IdentityTolerance
                && Mathf.Abs(matrix.m23) < IdentityTolerance
                && Mathf.Abs(matrix.m30) < IdentityTolerance
                && Mathf.Abs(matrix.m31) < IdentityTolerance
                && Mathf.Abs(matrix.m32) < IdentityTolerance;
        }

        private void OnValidate()
        {
            if (scale < 0.001f)
            {
                scale = 0.001f;
            }
        }
    }
}
