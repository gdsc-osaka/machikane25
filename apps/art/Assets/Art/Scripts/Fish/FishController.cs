using UnityEngine;

public class FishController : MonoBehaviour
{
    [SerializeField] private Animator animator;
    public float speed = 2.0f;
    public float rotationSpeed = 4.0f;
    [SerializeField] private float obstacleDetectionDistance = 2.0f;
    [SerializeField] private float avoidanceForce = 5.0f;
    [SerializeField] private LayerMask obstacleLayer = -1; // デフォルトは全レイヤー
    private Vector3 targetPosition;
    private bool isSwimming = true; // アイドル状態との切り替え用

    void Start()
    {
        // 最初はランダムな目標地点を設定
        // SetNewRandomTarget();
    }

    void Update()
    {
        float currentSpeed = 0f;
        float direction = 0f;

        // 障害物検知
        if (DetectObstacle(out RaycastHit hit))
        {
            // 障害物を回避する新しい目標を設定
            AvoidObstacle(hit);
        }

        // 目標地点に向かって移動・回転
        if (Vector3.Distance(transform.position, targetPosition) > 1.0f)
        {
            // 前方に移動
            transform.position += transform.forward * (speed * Time.deltaTime);
            currentSpeed = speed;

            // 目標地点の方を向く
            Quaternion targetRotation = Quaternion.LookRotation(targetPosition - transform.position);
            Quaternion previousRotation = transform.rotation;
            transform.rotation = Quaternion.Slerp(transform.rotation, targetRotation, rotationSpeed * Time.deltaTime);

            // 回転の変化量を計算（Y軸の角度差）
            float angleDifference = Quaternion.Angle(previousRotation, transform.rotation);
            Vector3 cross = Vector3.Cross(previousRotation * Vector3.forward, transform.rotation * Vector3.forward);
            direction = cross.y > 0 ? angleDifference : -angleDifference;
        }
        else
        {
            // 目標に到達したら新しい目標を設定
            SetNewRandomTarget();
        }

        // Animatorのパラメータを更新
        if (animator != null)
        {
            animator.SetFloat("Speed", currentSpeed);
            animator.SetFloat("Direction", direction);
        }
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

    // 前方の障害物を検知
    private bool DetectObstacle(out RaycastHit hit)
    {
        // 前方にレイキャストして障害物を検知
        return Physics.Raycast(transform.position, transform.forward, out hit, obstacleDetectionDistance, obstacleLayer);
    }

    // 障害物を回避する
    private void AvoidObstacle(RaycastHit hit)
    {
        // 衝突点の法線方向に回避
        Vector3 avoidanceDirection = hit.normal;

        // 回避方向にランダム性を追加して自然な動きに
        avoidanceDirection += new Vector3(
            Random.Range(-0.5f, 0.5f),
            Random.Range(-0.5f, 0.5f),
            Random.Range(-0.5f, 0.5f)
        );

        // 新しい目標位置を設定（現在位置から回避方向へ）
        targetPosition = transform.position + avoidanceDirection.normalized * avoidanceForce;
    }

    // 物理衝突が発生した場合の処理
    private void OnCollisionEnter(Collision collision)
    {
        // 衝突した場合、即座に新しい目標を設定
        Vector3 awayFromCollision = transform.position - collision.contacts[0].point;
        targetPosition = transform.position + awayFromCollision.normalized * avoidanceForce;
    }

    // 衝突が継続している場合の処理
    private void OnCollisionStay(Collision collision)
    {
        // 衝突オブジェクトから離れる方向に移動
        Vector3 awayFromCollision = transform.position - collision.contacts[0].point;
        transform.position += awayFromCollision.normalized * (speed * Time.deltaTime);
    }
}