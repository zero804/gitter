from selenium import webdriver
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities
import urllib2
import os
import time
import json


def baseUrl(url):
    base = os.getenv('BASE_URL')
    if(base is None):
        base = "http://localhost:5000/"
    return base + url


def driver():
    driverName = os.getenv('DRIVER')
    if driverName is None:
        driverName = 'CHROME'

    remote = os.getenv('REMOTE_EXECUTOR')
    if remote is None:
        remote = 'http://10.8.0.14:5555/wd/hub'

    if driverName == 'FIREFOX':
        print('Using local Firefox')
        driver = webdriver.Firefox()

    elif driverName == 'IE':
        print('Using local IE')
        driver = webdriver.IE()

    elif driverName == 'PHANTOMJS':
        print('Using local PhantomJS')
        driver = webdriver.PhantomJS()

    elif driverName == 'CHROME':
        print('Using local Chrome')

        e2edir = os.path.dirname(os.path.abspath(__file__))
        driver = webdriver.Chrome(e2edir + '/../chromedriver/chromedriver')

    elif driverName == 'REMOTECHROME':
        print('Using remote chrome')
        driver = webdriver.Remote(command_executor=remote, desired_capabilities=DesiredCapabilities.CHROME)

    elif driverName == 'REMOTEIE':
        print('Using remote IE')
        ie = {'platform': 'WINDOWS',
              'browserName': 'internet explorer',
              'version': '',
              'javascriptEnabled': True,
              'ignoreZoomSetting': True}
        driver = webdriver.Remote(command_executor=remote, desired_capabilities=ie)

    elif driverName == 'REMOTEFIREFOX':
        print('Using remote Firefox')
        driver = webdriver.Remote(command_executor=remote, desired_capabilities=DesiredCapabilities.FIREFOX)

    driver.delete_all_cookies()
    driver.implicitly_wait(30)

    driver.get(baseUrl("signout"))

    driver.find_element_by_css_selector('DIV.trpHomeHeroStripContainer')

    driver.delete_all_cookies()

    return driver


def existingUserlogin(driver, usernameValue, passwordValue):
    print('Navigating to ' + baseUrl("x"))
    driver.get(baseUrl("x"))

    time.sleep(0.5)

    existingButton = driver.find_element_by_css_selector("#button-existing-users-login")
    existingButton.click()

    time.sleep(0.5)

    name = driver.find_element_by_css_selector('#email')
    name.send_keys(usernameValue)

    password = driver.find_element_by_css_selector('#password')
    password.send_keys(passwordValue)

    driver.find_element_by_css_selector('#signin-button').click()
    driver.find_element_by_css_selector('DIV.trpHeaderTitle')


def screenshot(driver):
    e2edir = os.path.dirname(os.path.abspath(__file__))
    filename = os.path.abspath(e2edir + '/../../../output/screenshot-' + time.strftime("%Y-%m-%d-%H-%M-%S", time.gmtime()) + '.png')
    print('Screenshot saved at ' + filename)
    driver.get_screenshot_as_file(filename)


def getJSON(url):
    response = urllib2.urlopen(baseUrl(url)).read()
    return json.loads(response)
