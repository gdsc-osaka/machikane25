using UnityEngine;

namespace Art.App
{
    [ExecuteInEditMode]
    public class AsymmetricProjection : MonoBehaviour
    {
        public Camera cameraLeft;
        public Camera cameraRight;

        void LateUpdate()
        {
            if (cameraLeft == null || cameraRight == null)
            {
                return;
            }

            // 2つのカメラのTransformと基本設定を同期させる
            cameraRight.transform.position = cameraLeft.transform.position;
            cameraRight.transform.rotation = cameraLeft.transform.rotation;
            cameraRight.fieldOfView = cameraLeft.fieldOfView;
            cameraRight.nearClipPlane = cameraLeft.nearClipPlane;
            cameraRight.farClipPlane = cameraLeft.farClipPlane;

            // --- ここからが修正箇所 ---

            // 1. 基本パラメータの取得
            float fov = cameraLeft.fieldOfView; // 垂直FOV
            float near = cameraLeft.nearClipPlane;
            float far = cameraLeft.farClipPlane;

            // 2. 単一ディスプレイのアスペクト比を「手動で」計算
            // (camera.aspect は時々正しくない値を返すため、Display 1 から直接取得)
            Display display1 = Display.displays[0]; // 0はDisplay 1
            float singleScreenAspect = (float)display1.renderingWidth / (float)display1.renderingHeight;

            // 3.「全体」のアスペクト比を計算 (例: 16:9 * 2 = 32:9)
            float totalAspect = singleScreenAspect * 2.0f;

            // 4. nearクリップ平面での「高さ」を計算
            float top = near * Mathf.Tan(fov * 0.5f * Mathf.Deg2Rad);
            float bottom = -top;

            // 5.「全体」のビューの「半分の幅」を計算
            // (全体の幅 = top * totalAspect * 2 ではない)
            // (全体の半分の幅 = top * totalAspect)
            float totalHalfWidth = top * totalAspect;

            // 6. 左カメラ用の非対称行列を作成
            // Frustum(left, right, bottom, top, near, far)
            // -totalHalfWidth から 0 までを描画 (これで入力アスペクト比が 16:9 になる)
            Matrix4x4 leftMatrix = Matrix4x4.Frustum(-totalHalfWidth, 0, bottom, top, near, far);

            // 7. 右カメラ用の非対称行列を作成
            // 0 から +totalHalfWidth までを描画 (これも入力アスペクト比が 16:9 になる)
            Matrix4x4 rightMatrix = Matrix4x4.Frustum(0, totalHalfWidth, bottom, top, near, far);

            // 8. 各カメラの投影行列を上書き
            cameraLeft.projectionMatrix = leftMatrix;
            cameraRight.projectionMatrix = rightMatrix;
        }
    }
}