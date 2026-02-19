package com.payment.service.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "wompi")
public class WompiProperties {

    private String baseUrl;
    private boolean useProd;

    private String privateKeyTest;
    private String integrityTest;

    private String privateKeyProd;
    private String integrityProd;

    public String getBaseUrl() {
        return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    public boolean isUseProd() {
        return useProd;
    }

    public void setUseProd(boolean useProd) {
        this.useProd = useProd;
    }

    public String getPrivateKeyTest() {
        return privateKeyTest;
    }

    public void setPrivateKeyTest(String privateKeyTest) {
        this.privateKeyTest = privateKeyTest;
    }

    public String getIntegrityTest() {
        return integrityTest;
    }

    public void setIntegrityTest(String integrityTest) {
        this.integrityTest = integrityTest;
    }

    public String getPrivateKeyProd() {
        return privateKeyProd;
    }

    public void setPrivateKeyProd(String privateKeyProd) {
        this.privateKeyProd = privateKeyProd;
    }

    public String getIntegrityProd() {
        return integrityProd;
    }

    public void setIntegrityProd(String integrityProd) {
        this.integrityProd = integrityProd;
    }

    public String resolvePrivateKey() {
        return useProd ? privateKeyProd : privateKeyTest;
    }

    public String resolveIntegrityKey() {
        return useProd ? integrityProd : integrityTest;
    }
}
