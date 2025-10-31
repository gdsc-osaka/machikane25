using UnityEngine;

public class FishController : MonoBehaviour
{
    public float speed = 2.0f;
    public float rotationSpeed = 4.0f;
    private Vector3 targetPosition;
    private bool isSwimming = true; // アイドル状態との切り替え用

    void Start()
    {
        // 最初はランダムな目標地点を設定
        // SetNewRandomTarget();
    }

    void Update()
    {
        // 目標地点に向かって移動・回転
        if (Vector3.Distance(transform.position, targetPosition) > 1.0f)
        {
            // 前方に移動
            transform.position += transform.forward * (speed * Time.deltaTime);

            // 目標地点の方を向く
            Quaternion targetRotation = Quaternion.LookRotation(targetPosition - transform.position);
            transform.rotation = Quaternion.Slerp(transform.rotation, targetRotation, rotationSpeed * Time.deltaTime);
        }
        else
        {
            // 目標に到達したら新しい目標を設定
            SetNewRandomTarget();
        }

        // Animatorのパラメータを更新
        // animator.SetBool("IsSwimming", isSwimming);
    }

    // Aquariumの範囲内でランダムな目標地点を設定するメソッド
    void SetNewRandomTarget()
    {
        // TODO: 後でFlockControllerが管理するAquariumの範囲を取得するように変更
        float x = Random.Range(-5f, 5f);
        float y = Random.Range(0f, 5f);
        float z = Random.Range(-5f, 5f);
        targetPosition = new Vector3(x, y, z);
    }
}