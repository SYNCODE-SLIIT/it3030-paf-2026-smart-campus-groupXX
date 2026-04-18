package com.university.smartcampus.user.identifier;

import com.university.smartcampus.common.entity.TimestampedEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "identifier_counters")
public class IdentifierCounterEntity extends TimestampedEntity {

    @Id
    @Column(name = "counter_key", length = 120)
    private String counterKey;

    @Column(name = "last_value", nullable = false)
    private long lastValue;

    public String getCounterKey() {
        return counterKey;
    }

    public void setCounterKey(String counterKey) {
        this.counterKey = counterKey;
    }

    public long getLastValue() {
        return lastValue;
    }

    public void setLastValue(long lastValue) {
        this.lastValue = lastValue;
    }
}
