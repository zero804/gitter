from selenium import webdriver
import os
import time


def baseUrl(url):
    base = os.getenv('BASE_URL')
    if(base is None):
        base = "http://localhost:5000/"
    return base + url


def driver():
    #driver = webdriver.Firefox()
    #driver = webdriver.PhantomJS()
    e2edir = os.path.dirname(os.path.abspath(__file__))

    driver = webdriver.Chrome(e2edir + '/../chromedriver/chromedriver')
    driver.delete_all_cookies()
    driver.implicitly_wait(30)
    return driver


def existingUserlogin(driver, usernameValue, passwordValue):
    print('Navigating to ' + baseUrl("x"))
    driver.get(baseUrl("x"))

    existingButton = driver.find_element_by_css_selector("#button-existing-users-login")
    existingButton.click()

    name = driver.find_element_by_css_selector('#email')
    name.send_keys(usernameValue)

    password = driver.find_element_by_css_selector('#password')
    password.send_keys(passwordValue)

    driver.find_element_by_css_selector('#signin-button').click()
    driver.find_element_by_css_selector('DIV.trpHeaderTitle')


def screenshot(driver):
    e2edir = os.path.dirname(os.path.abspath(__file__))
    driver.get_screenshot_as_file(e2edir + '/../../../output/screenshot-' + time.strftime("%Y-%m-%d-%H-%M-%S", time.gmtime()) + '.png')
