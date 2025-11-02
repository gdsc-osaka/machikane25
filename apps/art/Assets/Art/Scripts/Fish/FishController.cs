using UnityEngine;

public class FishController : MonoBehaviour
{
    [SerializeField] private Animator animator;
    [SerializeField] private float baseSpeed = 2.0f;
    [SerializeField] private float rotationSpeed = 4.0f;
    [SerializeField] private float obstacleDetectionDistance = 2.0f;
    [SerializeField] private float avoidanceForce = 5.0f;
    [SerializeField] private LayerMask obstacleLayer = -1; // デフォルトは全レイヤー
    [SerializeField] private float velocityLerpSpeed = 6f;

    private Vector3 currentVelocity;
    private Vector3 desiredVelocity;
    private bool hasDesiredVelocity;
    private bool allowLegacyWander = true;

    public float speed { get; private set; }

    public Vector3 CurrentVelocity => currentVelocity;

    private void Awake()
    {
        currentVelocity = transform.forward * baseSpeed;
        desiredVelocity = currentVelocity;
        speed = currentVelocity.magnitude;
    }

    public void SetBoidVelocity(Vector3 velocity)
    {
        desiredVelocity = velocity;
        hasDesiredVelocity = true;
        allowLegacyWander = false;
    }

    private void Update()
    {
        var deltaTime = Time.deltaTime;

        if (hasDesiredVelocity)
        {
            UpdateBoidMotion(deltaTime);
        }
        else if (!allowLegacyWander)
        {
            ContinueGlide(deltaTime);
        }
        else
        {
            LegacyWander(deltaTime);
        }
    }

    private void UpdateBoidMotion(float deltaTime)
    {
        var targetVelocity = EnsureBaselineVelocity(desiredVelocity);
        hasDesiredVelocity = false;

        targetVelocity = AdjustForObstacles(targetVelocity);

        currentVelocity = Vector3.Lerp(currentVelocity, targetVelocity, Mathf.Clamp01(deltaTime * velocityLerpSpeed));
        if (currentVelocity.sqrMagnitude < 0.0001f)
        {
            currentVelocity = targetVelocity;
        }

        ApplyMovement(currentVelocity, deltaTime);
    }

    private void ContinueGlide(float deltaTime)
    {
        if (currentVelocity.sqrMagnitude < 0.0001f)
        {
            currentVelocity = EnsureBaselineVelocity(currentVelocity);
        }

        currentVelocity = AdjustForObstacles(currentVelocity);

        ApplyMovement(currentVelocity, deltaTime);
    }

    private void LegacyWander(float deltaTime)
    {
        // Maintain backwards compatibility when boid steering is unavailable.
        if (currentVelocity.sqrMagnitude < 0.001f)
        {
            currentVelocity = Random.insideUnitSphere.normalized * baseSpeed;
        }

        currentVelocity = AdjustForObstacles(currentVelocity);

        ApplyMovement(currentVelocity, deltaTime);
    }

    private void ApplyMovement(Vector3 velocity, float deltaTime)
    {
        var direction = velocity.normalized;
        var magnitude = velocity.magnitude;

        if (magnitude < 0.0001f)
        {
            return;
        }

        var previousRotation = transform.rotation;
        transform.position += velocity * deltaTime;
        transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.LookRotation(direction), rotationSpeed * deltaTime);

        currentVelocity = direction * magnitude;
        speed = magnitude;

        UpdateAnimator(previousRotation, transform.rotation, magnitude);
    }

    private void UpdateAnimator(Quaternion previousRotation, Quaternion newRotation, float currentSpeed)
    {
        if (animator == null)
        {
            return;
        }

        animator.SetFloat("Speed", currentSpeed);

        var angleDifference = Quaternion.Angle(previousRotation, newRotation);
        var cross = Vector3.Cross(previousRotation * Vector3.forward, newRotation * Vector3.forward);
        var direction = cross.y > 0 ? angleDifference : -angleDifference;
        animator.SetFloat("Direction", direction);
    }

    private bool DetectObstacle(Vector3 velocity, out RaycastHit hit)
    {
        var direction = velocity.sqrMagnitude > 0.001f ? velocity.normalized : transform.forward;
        return Physics.Raycast(transform.position, direction, out hit, obstacleDetectionDistance, obstacleLayer);
    }

    private Vector3 AdjustForObstacles(Vector3 desiredVelocity)
    {
        if (!DetectObstacle(desiredVelocity, out var hit))
        {
            return desiredVelocity;
        }

        var desiredMagnitude = Mathf.Max(desiredVelocity.magnitude, baseSpeed);
        var parallel = Vector3.ProjectOnPlane(desiredVelocity, hit.normal);
        Vector3 adjusted;

        if (parallel.sqrMagnitude > 0.0001f)
        {
            adjusted = parallel.normalized * desiredMagnitude;
        }
        else
        {
            adjusted = hit.normal * desiredMagnitude;
        }

        adjusted += hit.normal * avoidanceForce;
        return adjusted;
    }

    private Vector3 EnsureBaselineVelocity(Vector3 velocity)
    {
        if (velocity.sqrMagnitude >= 0.0001f)
        {
            return velocity;
        }

        if (transform.forward.sqrMagnitude > 0.001f)
        {
            return transform.forward.normalized * baseSpeed;
        }

        return Vector3.forward * baseSpeed;
    }

    private void OnCollisionEnter(Collision collision)
    {
        var awayFromCollision = transform.position - collision.contacts[0].point;
        ApplyCollisionImpulse(awayFromCollision);
    }

    private void OnCollisionStay(Collision collision)
    {
        var awayFromCollision = transform.position - collision.contacts[0].point;
        ApplyCollisionImpulse(awayFromCollision);
    }

    private void ApplyCollisionImpulse(Vector3 direction)
    {
        if (direction.sqrMagnitude < 0.0001f)
        {
            return;
        }

        var escapeSpeed = Mathf.Max(baseSpeed, currentVelocity.magnitude);
        var escapeVelocity = direction.normalized * escapeSpeed;
        desiredVelocity = escapeVelocity;
        hasDesiredVelocity = true;
        currentVelocity = escapeVelocity;
    }
}
